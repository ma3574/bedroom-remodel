// Venetian blinds (faux wood or aluminium) in the window recess or face-fixed above it.
// Built in window-wall space: local x = along the wall (a), y = up (b), z = outwards (c).
import * as THREE from 'three';
import { CONFIG, type BlindSpec } from '../config';
import { blindPanels, slatLayout, type BlindPanel } from '../lib/blinds';
import { M } from '../materials/library';
import type { State } from '../state';
import { deg, mm } from '../units';
import { WALLS, wallPoint, wallQuaternion } from './walls';

export interface BlindRefs {
  group: THREE.Group;
  /** lowered 0–100 %, tilt in degrees. */
  update: (lowered: number, tilt: number) => void;
}

const blindMat = new THREE.MeshStandardMaterial({ color: '#F4F2EE', roughness: 0.55 });
const cordMat = new THREE.MeshStandardMaterial({ color: '#EAE6DF', roughness: 0.85 });
const wandMat = new THREE.MeshStandardMaterial({ color: '#E9EEF0', roughness: 0.15, transparent: true, opacity: 0.55 });

function applyFinish(s: State): void {
  const f = CONFIG.blinds.finishes[s.blinds.finish];
  const metalType = s.blinds.type === 'metal';
  blindMat.color.set(f.colour);
  blindMat.map = f.grain ? M.oak.map : null;
  blindMat.metalness = f.metallic ? 0.9 : metalType ? 0.25 : 0;
  blindMat.roughness = f.metallic ? 0.32 : metalType ? 0.4 : 0.55;
  blindMat.needsUpdate = true;
  cordMat.color.set(f.grain ? '#D8CAB2' : f.colour).multiplyScalar(0.94);
}

function box(a0: number, a1: number, b0: number, b1: number, c0: number, c1: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(mm(a1 - a0), mm(b1 - b0), mm(c1 - c0)), mat);
  m.position.set(mm((a0 + a1) / 2), mm((b0 + b1) / 2), mm((c0 + c1) / 2));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

interface PanelRefs {
  p: BlindPanel;
  slats: THREE.InstancedMesh;
  rail: THREE.Mesh;
  cords: THREE.Mesh[];
}

function buildPanel(group: THREE.Group, p: BlindPanel, spec: BlindSpec, face: boolean): PanelRefs {
  const width = p.a1 - p.a0;
  const hc0 = p.slatC - spec.headrail.d / 2; // room-side face of the headrail
  const hc1 = p.slatC + spec.headrail.d / 2;
  group.add(box(p.a0, p.a1, p.top - spec.headrail.h, p.top, hc0, hc1, blindMat));

  if (spec.valance) {
    group.add(box(p.a0 - 3, p.a1 + 3, p.top - spec.valance, p.top, hc0 - 12, hc0 - 2, blindMat));
    if (face) {
      // Valance returns back to the wall.
      group.add(box(p.a0 - 13, p.a0 - 3, p.top - spec.valance, p.top, hc0 - 12, 0, blindMat));
      group.add(box(p.a1 + 3, p.a1 + 13, p.top - spec.valance, p.top, hc0 - 12, 0, blindMat));
    }
  }
  if (face) {
    for (const a of [p.a0 + 60, p.a1 - 60]) group.add(box(a - 15, a + 15, p.top - spec.headrail.h, p.top, hc1, 0, M.upvc));
  }

  const n = slatLayout(spec, p.top, p.bottom, 1).slats.length;
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(mm(width - 6), mm(spec.thickness), mm(spec.slat)), blindMat, n);
  slats.castShadow = true;
  slats.receiveShadow = true;
  slats.frustumCulled = false; // slats move; avoid a stale bounding sphere
  group.add(slats);

  const rail = box(p.a0 + 2, p.a1 - 2, -spec.bottomRail / 2, spec.bottomRail / 2, p.slatC - spec.slat / 2, p.slatC + spec.slat / 2, blindMat);
  group.add(rail);

  const cords: THREE.Mesh[] = [];
  const ladders = width > 900 ? [0.12, 0.5, 0.88] : [0.15, 0.85];
  for (const t of ladders) {
    for (const side of [-1, 1]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(mm(spec.cord), mm(spec.cord), 1, 6), cordMat);
      cord.position.set(mm(p.a0 + width * t), 0, mm(p.slatC + side * (spec.slat / 2 - 1.5)));
      cord.castShadow = true;
      cords.push(cord);
      group.add(cord);
    }
  }

  const wandLen = Math.min(900, (p.top - p.bottom) * 0.55);
  const wand = new THREE.Mesh(new THREE.CylinderGeometry(mm(4), mm(4), mm(wandLen), 10), wandMat);
  wand.position.set(mm(p.a0 + 45), mm(p.top - spec.headrail.h - wandLen / 2), mm(hc0 - 6));
  group.add(wand);

  return { p, slats, rail, cords };
}

export function buildBlinds(s: State): BlindRefs {
  const group = new THREE.Group();
  group.name = 'blinds';
  if (s.blinds.type === 'none') return { group, update: () => {} };

  const spec = CONFIG.blinds.types[s.blinds.type];
  applyFinish(s);
  const w = WALLS.window;
  group.quaternion.copy(wallQuaternion(w));
  group.position.copy(wallPoint(w, 0, 0, 0));
  const face = s.blinds.mount === 'face';
  const panels = blindPanels(spec, s.blinds.mount, s.blinds.panels).map((p) => buildPanel(group, p, spec, face));

  const q = new THREE.Quaternion();
  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const xAxis = new THREE.Vector3(1, 0, 0);

  const update = (lowered: number, tilt: number) => {
    for (const r of panels) {
      const { slats, railTop, zoneTop } = slatLayout(spec, r.p.top, r.p.bottom, lowered / 100);
      const am = (r.p.a0 + r.p.a1) / 2;
      slats.forEach((sl, i) => {
        q.setFromAxisAngle(xAxis, sl.stacked ? 0 : deg(tilt));
        pos.set(mm(am), mm(sl.y), mm(r.p.slatC));
        r.slats.setMatrixAt(i, m4.compose(pos, q, one));
      });
      r.slats.instanceMatrix.needsUpdate = true;
      r.rail.position.y = mm(railTop - spec.bottomRail / 2);
      const len = Math.max(0.1, zoneTop - railTop);
      for (const c of r.cords) {
        c.scale.y = mm(len);
        c.position.y = mm(railTop + len / 2);
      }
    }
  };
  update(s.blinds.lowered, s.blinds.tilt);
  return { group, update };
}
