// Wall coordinate frames and helpers for building things in wall space.
// Wall coords (mm): a = along the wall, b = up, c = outwards from the inner face
// (negative c = in front of the wall, inside the room).
import * as THREE from 'three';
import { CONFIG } from '../config';
import { mm } from '../units';

export type Wall4 = 'bed' | 'wardrobe' | 'door' | 'window';

export interface WallFrame {
  id: Wall4;
  origin: [number, number]; // room (x, z) mm at a = 0, inner face
  u: [number, number]; // along-wall direction (x, z)
  n: [number, number]; // outward normal (x, z)
  length: number;
  thickness: number;
}

const R = CONFIG.room;
const T = CONFIG.wallThickness;

// u = y × n keeps every basis right-handed.
export const WALLS: Record<Wall4, WallFrame> = {
  bed: { id: 'bed', origin: [R.width, 0], u: [-1, 0], n: [0, -1], length: R.width, thickness: T.bed },
  wardrobe: { id: 'wardrobe', origin: [0, R.depth], u: [1, 0], n: [0, 1], length: R.width, thickness: T.wardrobe },
  door: { id: 'door', origin: [0, 0], u: [0, 1], n: [-1, 0], length: R.depth, thickness: T.door },
  window: { id: 'window', origin: [R.width, R.depth], u: [0, -1], n: [1, 0], length: R.depth, thickness: T.window },
};

const quatCache = new Map<Wall4, THREE.Quaternion>();

export function wallQuaternion(w: WallFrame): THREE.Quaternion {
  let q = quatCache.get(w.id);
  if (!q) {
    const u = new THREE.Vector3(w.u[0], 0, w.u[1]);
    const n = new THREE.Vector3(w.n[0], 0, w.n[1]);
    q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, new THREE.Vector3(0, 1, 0), n));
    quatCache.set(w.id, q);
  }
  return q;
}

/** Scene position (metres) of wall coords (mm). */
export function wallPoint(w: WallFrame, a: number, b: number, c: number): THREE.Vector3 {
  return new THREE.Vector3(
    mm(w.origin[0] + w.u[0] * a + w.n[0] * c),
    mm(b),
    mm(w.origin[1] + w.u[1] * a + w.n[1] * c),
  );
}

/** Along-wall coordinate (mm) of a room point. */
export function alongWall(w: WallFrame, x: number, z: number): number {
  return (x - w.origin[0]) * w.u[0] + (z - w.origin[1]) * w.u[1];
}

export function wallBox(
  w: WallFrame,
  a0: number,
  a1: number,
  b0: number,
  b1: number,
  c0: number,
  c1: number,
  mat: THREE.Material | THREE.Material[],
  castShadow = true,
): THREE.Mesh {
  const g = new THREE.BoxGeometry(mm(Math.abs(a1 - a0)), mm(Math.abs(b1 - b0)), mm(Math.abs(c1 - c0)));
  const m = new THREE.Mesh(g, mat);
  m.quaternion.copy(wallQuaternion(w));
  m.position.copy(wallPoint(w, (a0 + a1) / 2, (b0 + b1) / 2, (c0 + c1) / 2));
  m.castShadow = castShadow;
  m.receiveShadow = true;
  return m;
}

/** Polygon in wall (a, b) mm, extruded from c0 to c1. */
export function wallPrism(
  w: WallFrame,
  pts: [number, number][],
  c0: number,
  c1: number,
  mat: THREE.Material,
  holes: [number, number][][] = [],
): THREE.Mesh {
  const shape = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(mm(a), mm(b))));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([a, b]) => new THREE.Vector2(mm(a), mm(b)))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: mm(c1 - c0), bevelEnabled: false, curveSegments: 1 });
  const m = new THREE.Mesh(g, mat);
  m.quaternion.copy(wallQuaternion(w));
  m.position.copy(wallPoint(w, 0, 0, c0));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
