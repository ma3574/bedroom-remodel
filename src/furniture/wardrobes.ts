// 4 × PAX frames with 8 Bergsbo doors, MDF side fillers, recessed kick and a top filler to the ceiling.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CONFIG } from '../config';
import { boxMM } from '../geom';
import { wardrobeDims, wardrobeDoor } from '../layout';
import { M } from '../materials/library';
import type { State } from '../state';
import { mm } from '../units';
import { makeHandle } from './handles';

export interface WardrobeRefs {
  group: THREE.Group;
  fillers: THREE.Group;
  doorPivots: THREE.Object3D[];
}

const W = CONFIG.wardrobes;

function framePiece(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): THREE.Mesh {
  const g = new RoundedBoxGeometry(mm(x1 - x0), mm(y1 - y0), mm(z1 - z0), 2, mm(1.5));
  const m = new THREE.Mesh(g, M.greyBeige);
  m.position.set(mm((x0 + x1) / 2), mm((y0 + y1) / 2), mm((z0 + z1) / 2));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Bergsbo frame-and-panel door in hinge-local space: x from 0 to `sign`·495
 * (sign −1 for right-hinged doors), y from 0 (door bottom) to doorH,
 * z from −19 (front face) to 0 (back face).
 */
function bergsbo(doorH: number, panels: number, sign: 1 | -1, handle: THREE.Group | null, handleY: number): THREE.Group {
  const D = W.door;
  const g = new THREE.Group();
  const X = (v: number) => sign * v;
  const xr = (a: number, b: number): [number, number] => [Math.min(X(a), X(b)), Math.max(X(a), X(b))];
  const recess = D.panelRecess;
  const [sx0, sx1] = xr(0, D.w);
  g.add(boxMM([sx0, 0, -(D.t - recess)], [sx1, doorH, 0], M.greyBeige));
  const front = -D.t;
  const back = -(D.t - recess);
  for (const [a, b] of [
    [0, D.stile],
    [D.w - D.stile, D.w],
  ]) {
    const [x0, x1] = xr(a, b);
    g.add(framePiece(x0, x1, 0, doorH, front, back));
  }
  const panelH = (doorH - 2 * D.rail - (panels - 1) * D.midRail) / panels;
  const [rx0, rx1] = xr(D.stile, D.w - D.stile);
  g.add(framePiece(rx0, rx1, 0, D.rail, front, back), framePiece(rx0, rx1, doorH - D.rail, doorH, front, back));
  for (let i = 1; i < panels; i++) {
    const y0 = D.rail + i * panelH + (i - 1) * D.midRail;
    g.add(framePiece(rx0, rx1, y0, y0 + D.midRail, front, back));
  }
  if (handle) {
    handle.rotation.y = Math.PI; // protrude towards −z (into the room)
    handle.position.set(mm(X(D.w - D.stile / 2)), mm(handleY), mm(front));
    g.add(handle);
  }
  return g;
}

export function buildWardrobes(s: State): WardrobeRefs {
  const group = new THREE.Group();
  group.name = 'wardrobes';
  const d = wardrobeDims(s);
  const R = CONFIG.room;
  const run = W.run;
  const back = R.depth;

  // Base plinth under the frames (mostly hidden behind the kick).
  if (d.base > 0) group.add(boxMM([run.xStart, 0, d.frameFrontZ], [run.xStart + run.units * run.unitWidth, d.base, back], M.kick));

  // Carcasses
  const P = W.panelThickness;
  for (let f = 0; f < run.units; f++) {
    const x0 = run.xStart + f * run.unitWidth;
    const x1 = x0 + run.unitWidth;
    const y0 = d.base;
    const y1 = d.base + d.frameH;
    const z0 = d.frameFrontZ;
    group.add(
      boxMM([x0, y0, z0], [x0 + P, y1, back], M.carcass),
      boxMM([x1 - P, y0, z0], [x1, y1, back], M.carcass),
      boxMM([x0 + P, y1 - P, z0], [x1 - P, y1, back], M.carcass),
      boxMM([x0 + P, y0, z0], [x1 - P, y0 + 60, back], M.carcass), // PAX bottom with plinth
      boxMM([x0, y0, back - 6], [x1, y1, back], M.carcass),
    );
  }

  // Doors on hinge pivots
  const doorPivots: THREE.Object3D[] = [];
  const hingeZ = d.frameFrontZ - W.door.gapToFrame;
  for (let i = 0; i < run.units * 2; i++) {
    const info = wardrobeDoor(i);
    const pivot = new THREE.Group();
    pivot.position.set(mm(info.hingeX), mm(d.doorBottom), mm(hingeZ));
    pivot.add(bergsbo(d.doorH, d.panels, info.hingeLeft ? 1 : -1, makeHandle(s.wardrobes.handle), s.wardrobes.handleHeight - d.doorBottom));
    pivot.userData.hingeLeft = info.hingeLeft;
    doorPivots.push(pivot);
    group.add(pivot);
  }

  // MDF fillers, flush with the door faces, painted grey-beige.
  const fillers = new THREE.Group();
  fillers.name = 'fillers';
  const gap = W.fillerShadowGap;
  const face = d.doorFaceZ;
  const runEnd = run.xStart + run.units * run.unitWidth;
  // Side fillers run up to meet the top filler; 0.5mm clear of walls/ceiling to avoid z-fighting.
  const e = 0.5;
  fillers.add(
    boxMM([e, d.doorBottom, face], [run.xStart - gap, d.doorTop + gap, back - e], M.greyBeige),
    boxMM([runEnd + gap, d.doorBottom, face], [R.width - e, d.doorTop + gap, back - e], M.greyBeige),
    boxMM([e, d.doorTop + gap, face], [R.width - e, R.ceiling - e, back - e], M.greyBeige),
    boxMM([e, 0.5, d.frameFrontZ], [R.width - e, d.doorBottom - gap, d.frameFrontZ + 18], M.kick),
  );
  group.add(fillers);

  return { group, fillers, doorPivots };
}
