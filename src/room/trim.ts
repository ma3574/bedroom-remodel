// Square-groove MDF skirting and architraves (room side of both door openings).
import type * as THREE from 'three';
import { CONFIG, OPENINGS } from '../config';
import { M } from '../materials/library';
import { WALLS, alongWall, wallBox, wallPrism, type Wall4, type WallFrame } from './walls';

const SK = CONFIG.skirting;
const AR = CONFIG.architrave;

function skirtingRun(w: WallFrame, a0: number, a1: number): THREE.Mesh[] {
  if (a1 - a0 < 1) return [];
  const gTop = SK.height - SK.groove.fromTop + SK.groove.w / 2;
  const gBot = SK.height - SK.groove.fromTop - SK.groove.w / 2;
  return [
    wallBox(w, a0, a1, 0, gBot, -SK.depth, 0, M.trim),
    wallBox(w, a0, a1, gBot, gTop, -(SK.depth - SK.groove.d), 0, M.trim),
    wallBox(w, a0, a1, gTop, SK.height, -SK.depth, 0, M.trim),
  ];
}

/** Mitred architrave around a floor-level opening with clear span [a0, a1] and clear height h. */
function architrave(w: WallFrame, a0: number, a1: number, h: number): THREE.Mesh[] {
  const inner = AR.reveal;
  const outer = AR.reveal + AR.width;
  const g0 = AR.groove.fromOuterEdge - AR.groove.w / 2;
  const g1 = AR.groove.fromOuterEdge + AR.groove.w / 2;
  // Strips measured from the outer edge: [from, to, depth]
  const strips: [number, number, number][] = [
    [0, g0, AR.depth],
    [g0, g1, AR.depth - AR.groove.d],
    [g1, AR.width, AR.depth],
  ];
  const headLo = h + inner;
  const out: THREE.Mesh[] = [];
  const leftTop = (a: number) => headLo + (a0 - inner - a);
  const rightTop = (a: number) => headLo + (a - (a1 + inner));
  const leftEnd = (b: number) => a0 - inner - (b - headLo);
  const rightEnd = (b: number) => a1 + inner + (b - headLo);
  for (const [d0, d1, depth] of strips) {
    // Left leg
    const la = a0 - outer + d0;
    const lb = a0 - outer + d1;
    out.push(wallPrism(w, [[la, 0], [lb, 0], [lb, leftTop(lb)], [la, leftTop(la)]], -depth, 0, M.trim));
    // Right leg
    const ra = a1 + outer - d1;
    const rb = a1 + outer - d0;
    out.push(wallPrism(w, [[ra, 0], [rb, 0], [rb, rightTop(rb)], [ra, rightTop(ra)]], -depth, 0, M.trim));
    // Head
    const bl = h + outer - d1;
    const bh = h + outer - d0;
    out.push(
      wallPrism(w, [[leftEnd(bl), bl], [rightEnd(bl), bl], [rightEnd(bh), bh], [leftEnd(bh), bh]], -depth, 0, M.trim),
    );
  }
  return out;
}

export function buildTrim(groups: Record<Wall4, THREE.Group>): void {
  const R = CONFIG.room;
  const { main, ensuite } = OPENINGS;
  const outer = AR.reveal + AR.width;
  // Built-ins cover everything past the wardrobe door faces.
  const doorFaceZ = R.depth - CONFIG.wardrobes.frameDepth - CONFIG.wardrobes.door.gapToFrame - CONFIG.wardrobes.door.t;

  groups.bed.add(...skirtingRun(WALLS.bed, 0, WALLS.bed.length));
  groups.door.add(
    ...skirtingRun(WALLS.door, 0, main.a0 - outer),
    ...skirtingRun(WALLS.door, main.a1 + outer, ensuite.a0 - outer),
    ...skirtingRun(WALLS.door, ensuite.a1 + outer, doorFaceZ),
  );
  groups.window.add(...skirtingRun(WALLS.window, alongWall(WALLS.window, R.width, doorFaceZ), WALLS.window.length));

  groups.door.add(...architrave(WALLS.door, main.a0, main.a1, main.h), ...architrave(WALLS.door, ensuite.a0, ensuite.a1, ensuite.h));
}
