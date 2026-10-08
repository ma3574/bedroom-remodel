// White uPVC window (opener / fixed / opener) set back in the reveal, with an internal window board.
import type * as THREE from 'three';
import { CONFIG, OPENINGS } from '../config';
import { M } from '../materials/library';
import { WALLS, wallBox } from './walls';

export function buildWindow(group: THREE.Group): void {
  const w = WALLS.window;
  const { a0, a1, b0, b1 } = OPENINGS.window;
  const P = CONFIG.window.frame.profile;
  const c0 = CONFIG.window.revealDepth;
  const c1 = c0 + CONFIG.window.frame.depth;

  // Outer frame
  group.add(
    wallBox(w, a0, a0 + P, b0, b1, c0, c1, M.upvc),
    wallBox(w, a1 - P, a1, b0, b1, c0, c1, M.upvc),
    wallBox(w, a0, a1, b1 - P, b1, c0, c1, M.upvc),
    wallBox(w, a0, a1, b0, b0 + P, c0, c1, M.upvc),
  );

  // Three lights split by two mullions
  const innerA0 = a0 + P;
  const innerA1 = a1 - P;
  const lightW = (innerA1 - innerA0 - 2 * P) / 3;
  const lights: [number, number][] = [];
  for (let i = 0; i < 3; i++) {
    const la = innerA0 + i * (lightW + P);
    lights.push([la, la + lightW]);
    if (i < 2) group.add(wallBox(w, la + lightW, la + lightW + P, b0 + P, b1 - P, c0, c1, M.upvc));
  }

  const lb0 = b0 + P;
  const lb1 = b1 - P;
  const glassC = (c0 + c1) / 2;
  lights.forEach(([la, lb], i) => {
    const opener = i !== 1;
    if (opener) {
      const S = 55;
      const sc0 = c0 - 10;
      const sc1 = c0 + 50;
      group.add(
        wallBox(w, la, la + S, lb0, lb1, sc0, sc1, M.upvc),
        wallBox(w, lb - S, lb, lb0, lb1, sc0, sc1, M.upvc),
        wallBox(w, la, lb, lb1 - S, lb1, sc0, sc1, M.upvc),
        wallBox(w, la, lb, lb0, lb0 + S, sc0, sc1, M.upvc),
        wallBox(w, la + S, lb - S, lb0 + S, lb1 - S, glassC - 3, glassC + 3, M.glass, false),
      );
      // Handle on the side nearest the centre light
      const ha = i === 0 ? lb - S / 2 : la + S / 2;
      const hb = (lb0 + lb1) / 2;
      group.add(
        wallBox(w, ha - 12, ha + 12, hb - 30, hb + 30, sc0 - 12, sc0, M.upvc),
        wallBox(w, ha - 8, ha + 8, hb - 110, hb, sc0 - 30, sc0 - 16, M.upvc),
      );
    } else {
      group.add(wallBox(w, la, lb, lb0, lb1, glassC - 3, glassC + 3, M.glass, false));
    }
  });

  // Internal window board: overhangs the wall face and runs past the reveal ("ears").
  const B = CONFIG.window.board;
  group.add(wallBox(w, a0 - B.ears, a1 + B.ears, b0 - B.t, b0, -B.overhang, c0, M.trim));
}
