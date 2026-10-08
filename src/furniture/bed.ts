// Danetti Avery super king: ribbed headboard, upholstered rail, walnut legs, ottoman lift, bedding.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config';
import { boxMM, roundedBoxMM } from '../geom';
import { bedRect } from '../layout';
import { M } from '../materials/library';
import type { State } from '../state';
import { mm } from '../units';

export interface BedRefs {
  group: THREE.Group;
  liftPivot: THREE.Object3D;
  bedding: THREE.Group;
}

const B = CONFIG.bed;

function headboard(): THREE.Group {
  const g = new THREE.Group();
  const HB = B.headboard;
  const w = B.width;
  const backT = HB.thickness - 17;
  // Backing slab with rounded top corners.
  const r = HB.cornerRadius;
  const x0 = -w / 2;
  const x1 = w / 2;
  const y0 = HB.bottom;
  const y1 = HB.height;
  const shape = new THREE.Shape();
  shape.moveTo(mm(x0), mm(y0));
  shape.lineTo(mm(x1), mm(y0));
  shape.lineTo(mm(x1), mm(y1 - r));
  shape.quadraticCurveTo(mm(x1), mm(y1), mm(x1 - r), mm(y1));
  shape.lineTo(mm(x0 + r), mm(y1));
  shape.quadraticCurveTo(mm(x0), mm(y1), mm(x0), mm(y1 - r));
  shape.lineTo(mm(x0), mm(y0));
  const slab = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: mm(backT - 6), bevelEnabled: true, bevelThickness: mm(3), bevelSize: mm(3), bevelSegments: 2, curveSegments: 6 }),
    M.fabric,
  );
  slab.position.z = mm(3);
  g.add(slab);

  // Vertical channels: half-buried capsules at a 36mm pitch.
  const pitch = HB.ribPitch;
  const n = Math.floor((w - 24) / pitch);
  const start = -((n - 1) * pitch) / 2;
  const ribR = pitch / 2 - 1;
  const ribs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const x = start + i * pitch;
    const edge = Math.max(0, Math.abs(x) - (w / 2 - r));
    const drop = edge > 0 ? r - Math.sqrt(Math.max(0, r * r - edge * edge)) : 0;
    const top = y1 - 18 - drop;
    const bottom = y0 + 18;
    const len = top - bottom - 2 * ribR;
    const geo = new THREE.CapsuleGeometry(mm(ribR), mm(len), 4, 10);
    geo.translate(mm(x), mm((top + bottom) / 2), mm(backT));
    ribs.push(geo);
  }
  const ribMesh = new THREE.Mesh(mergeGeometries(ribs), M.fabric);
  g.add(ribMesh);
  return g;
}

function legs(xs: number[], zs: number[]): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  for (const x of xs) {
    for (const z of zs) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(mm(18), mm(12), mm(B.legHeight), 20), M.walnut);
      leg.position.set(mm(x), mm(B.legHeight / 2), mm(z));
      out.push(leg);
    }
  }
  return out;
}

export function buildBed(s: State): BedRefs {
  const group = new THREE.Group();
  group.name = 'bed';
  const rect = bedRect(s);
  group.position.set(mm((rect.x0 + rect.x1) / 2), 0, mm(rect.z0));

  const w = B.width;
  const hbT = B.headboard.thickness;
  const len = B.length;
  const rail = 40;
  const legTop = B.legHeight;

  group.add(headboard());
  // Upholstered rail box (four sides) from the headboard to the foot.
  const R = 12;
  group.add(
    roundedBoxMM([-w / 2, legTop, hbT], [-w / 2 + rail, B.railTop, len], R, M.fabric),
    roundedBoxMM([w / 2 - rail, legTop, hbT], [w / 2, B.railTop, len], R, M.fabric),
    roundedBoxMM([-w / 2, legTop, len - rail], [w / 2, B.railTop, len], R, M.fabric),
    roundedBoxMM([-w / 2, legTop, hbT], [w / 2, B.railTop, hbT + rail], R, M.fabric),
  );
  // Storage well floor.
  const deckY = B.railTop - B.mattress.sinkIntoRail;
  group.add(boxMM([-w / 2 + rail, deckY - B.storageDepth - 18, hbT + rail], [w / 2 - rail, deckY - B.storageDepth, len - rail], M.storage));
  group.add(...legs([-w / 2 + 50, w / 2 - 50], [hbT + 50, len - 50]), ...legs([-w / 2 + 50, w / 2 - 50], [40]));

  // Lift assembly (deck + mattress + bedding) hinged at the head end.
  const liftPivot = new THREE.Group();
  liftPivot.position.set(0, mm(deckY), mm(hbT + rail));
  const lift = new THREE.Group();
  lift.position.set(0, mm(-deckY), mm(-(hbT + rail)));
  liftPivot.add(lift);
  const innerW = w - 2 * rail;
  lift.add(boxMM([-innerW / 2 + 2, deckY - 18, hbT + rail + 2], [innerW / 2 - 2, deckY, len - rail - 2], M.walnut));
  const MT = B.mattress;
  const mz0 = hbT + rail + (len - hbT - 2 * rail - MT.l) / 2;
  lift.add(roundedBoxMM([-MT.w / 2, deckY, mz0], [MT.w / 2, deckY + MT.h, mz0 + MT.l], 40, M.mattress, 4));

  const bedding = new THREE.Group();
  bedding.name = 'bedding';
  const top = deckY + MT.h;
  const duvetZ0 = mz0 + 520;
  const dw = MT.w + 80;
  bedding.add(
    roundedBoxMM([-dw / 2, top - 10, duvetZ0], [dw / 2, top + 55, mz0 + MT.l + 40], 25, M.duvet, 4),
    roundedBoxMM([-dw / 2 - 5, top - 210, duvetZ0 + 30], [-dw / 2 + 25, top + 20, mz0 + MT.l + 40], 12, M.duvet, 3),
    roundedBoxMM([dw / 2 - 25, top - 210, duvetZ0 + 30], [dw / 2 + 5, top + 20, mz0 + MT.l + 40], 12, M.duvet, 3),
    roundedBoxMM([-dw / 2, top - 210, mz0 + MT.l + 15], [dw / 2, top + 20, mz0 + MT.l + 45], 12, M.duvet, 3),
    // Folded-back top of the duvet
    roundedBoxMM([-dw / 2 + 10, top + 40, duvetZ0], [dw / 2 - 10, top + 85, duvetZ0 + 260], 20, M.duvet, 3),
  );
  for (const x of [-430, 430]) {
    const pillow = roundedBoxMM([x - 370, top, mz0 + 40], [x + 370, top + 150, mz0 + 420], 60, M.pillow, 4);
    pillow.rotation.x = -0.35;
    pillow.position.y += mm(60);
    bedding.add(pillow);
  }
  for (const x of [-230, 230]) {
    const cushion = roundedBoxMM([x - 220, top, mz0 + 330], [x + 220, top + 120, mz0 + 650], 50, M.cushion, 4);
    cushion.rotation.x = -0.5;
    cushion.position.y += mm(110);
    bedding.add(cushion);
  }
  lift.add(bedding);
  group.add(liftPivot);

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { group, liftPivot, bedding };
}
