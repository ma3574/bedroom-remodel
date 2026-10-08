// Walls with openings, ceiling, subfloor, door linings, spaces beyond the doors and the sky backdrop.
import * as THREE from 'three';
import { CONFIG, OPENINGS } from '../config';
import { M } from '../materials/library';
import { boxMM } from '../geom';
import { mm } from '../units';
import { buildTrim } from './trim';
import { buildWindow } from './window';
import { WALLS, wallBox, wallPrism, wallQuaternion, wallPoint, type Wall4, type WallFrame } from './walls';

export interface Shell {
  group: THREE.Group;
  wallGroups: Record<Wall4, THREE.Group>;
  ceiling: THREE.Object3D;
}

interface Notch {
  a0: number;
  a1: number;
  top: number;
}
interface Hole {
  a0: number;
  a1: number;
  b0: number;
  b1: number;
}

const H = CONFIG.room.ceiling;
const LIN = CONFIG.lining.thickness;

function wallMesh(w: WallFrame, notches: Notch[], holes: Hole[]): THREE.Mesh {
  const ext = 300; // overlap neighbouring walls at the corners
  const pts: [number, number][] = [[-ext, 0]];
  for (const n of [...notches].sort((p, q) => p.a0 - q.a0)) pts.push([n.a0, 0], [n.a0, n.top], [n.a1, n.top], [n.a1, 0]);
  pts.push([w.length + ext, 0], [w.length + ext, H], [-ext, H]);
  const holePts = holes.map((h): [number, number][] => [
    [h.a0, h.b0],
    [h.a1, h.b0],
    [h.a1, h.b1],
    [h.a0, h.b1],
  ]);
  return wallPrism(w, pts, 0, w.thickness, M.wall, holePts);
}

/** Lining boards inside a floor-level opening (structural opening is clear + lining). */
function linings(w: WallFrame, a0: number, a1: number, h: number): THREE.Mesh[] {
  return [
    wallBox(w, a0 - LIN, a0, 0, h + LIN, 0, w.thickness, M.trim),
    wallBox(w, a1, a1 + LIN, 0, h + LIN, 0, w.thickness, M.trim),
    wallBox(w, a0 - LIN, a1 + LIN, h, h + LIN, 0, w.thickness, M.trim),
  ];
}

/** Inward-facing box beyond an opening so open doors don't reveal empty space. */
function stub(w: WallFrame, a0: number, a1: number, floor: THREE.Material): THREE.Mesh {
  const depth = 1400;
  const lo = a0 - 400;
  const hi = a1 + 400;
  const g = new THREE.BoxGeometry(mm(hi - lo), mm(H), mm(depth));
  const floorMat = (floor as THREE.MeshStandardMaterial).clone();
  floorMat.side = THREE.BackSide;
  // Box faces: +x(+a), −x, +y (ceiling), −y (floor), +z (far), −z (towards room)
  const mats = [M.stubWall, M.stubWall, M.stubWall, floorMat, M.stubWall, M.stubWall];
  const m = new THREE.Mesh(g, mats);
  m.userData.ownMaterial = false;
  m.quaternion.copy(wallQuaternion(w));
  m.position.copy(wallPoint(w, (lo + hi) / 2, H / 2, w.thickness + depth / 2));
  m.receiveShadow = true;
  return m;
}

export function buildShell(): Shell {
  const group = new THREE.Group();
  group.name = 'shell';
  const wallGroups = {} as Record<Wall4, THREE.Group>;
  for (const id of Object.keys(WALLS) as Wall4[]) {
    const g = new THREE.Group();
    g.name = `wall-${id}`;
    wallGroups[id] = g;
    group.add(g);
  }

  const { main, ensuite, window: win } = OPENINGS;
  const door = WALLS.door;

  wallGroups.bed.add(wallMesh(WALLS.bed, [], []));
  wallGroups.wardrobe.add(wallMesh(WALLS.wardrobe, [], []));
  wallGroups.door.add(
    wallMesh(
      door,
      [
        { a0: main.a0 - LIN, a1: main.a1 + LIN, top: main.h + LIN },
        { a0: ensuite.a0 - LIN, a1: ensuite.a1 + LIN, top: ensuite.h + LIN },
      ],
      [],
    ),
  );
  wallGroups.window.add(wallMesh(WALLS.window, [], [{ a0: win.a0, a1: win.a1, b0: win.b0, b1: win.b1 }]));

  // Door linings, main door stop, thresholds and the spaces beyond.
  wallGroups.door.add(...linings(door, main.a0, main.a1, main.h), ...linings(door, ensuite.a0, ensuite.a1, ensuite.h));
  const leafT = CONFIG.mainDoor.leaf.t;
  const stop = CONFIG.lining.stop;
  wallGroups.door.add(
    wallBox(door, main.a0, main.a0 + stop.d, 0, main.h, leafT, leafT + stop.w, M.trim),
    wallBox(door, main.a1 - stop.d, main.a1, 0, main.h, leafT, leafT + stop.w, M.trim),
    wallBox(door, main.a0, main.a1, main.h - stop.d, main.h, leafT, leafT + stop.w, M.trim),
  );
  for (const o of [main, ensuite]) wallGroups.door.add(wallBox(door, o.a0, o.a1, 0, 8, 0, door.thickness, M.threshold, false));
  wallGroups.door.add(stub(door, main.a0, main.a1, M.carpet), stub(door, ensuite.a0, ensuite.a1, M.tile));

  buildWindow(wallGroups.window);
  buildTrim(wallGroups);

  // Sky backdrop outside the window (part of the window wall so it hides with it).
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), M.backdrop);
  backdrop.quaternion.copy(wallQuaternion(WALLS.window));
  backdrop.rotateY(Math.PI); // face back into the room
  backdrop.position.copy(wallPoint(WALLS.window, CONFIG.room.depth / 2, 1200, WALLS.window.thickness + 3500));
  wallGroups.window.add(backdrop);

  // Subfloor (visible through plank bevels) and ceiling slab.
  const R = CONFIG.room;
  group.add(boxMM([-300, -100, -300], [R.width + 300, 0.4, R.depth + 300], M.subfloor, false));
  const ceiling = boxMM([-300, H, -300], [R.width + 300, H + 100, R.depth + 300], M.ceiling);
  ceiling.name = 'ceiling';
  group.add(ceiling);

  return { group, wallGroups, ceiling };
}
