// Herringbone LVT floor as instanced planks, clipped to the room's inner wall faces.
import * as THREE from 'three';
import { CONFIG } from '../config';
import { generateHerringbone } from '../lib/herringbone';
import { floorMaterials } from '../materials/library';
import type { State } from '../state';
import { mm } from '../units';

const R = CONFIG.room;

export const floorClipPlanes = [
  new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), mm(R.width)),
  new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), mm(R.depth)),
];

export function buildFloor(s: State): THREE.Group {
  const F = CONFIG.floor;
  const group = new THREE.Group();
  group.name = 'floor';
  const planks = generateHerringbone({
    roomW: R.width,
    roomD: R.depth,
    plankW: F.plank.w,
    plankL: F.plank.l,
    axis: s.floor.axis,
    flip: s.floor.flip,
    centreline: s.floor.centreline,
    seed: F.seed,
    variants: F.textureVariants,
    jitter: F.lightnessJitter,
  });

  const inset = s.floor.gaps ? F.bevelInset : 0;
  const geom = new THREE.BoxGeometry(mm(F.plank.l - 2 * inset), mm(F.plank.t), mm(F.plank.w - 2 * inset));
  geom.translate(0, mm(0.5 + F.plank.t / 2), 0);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const col = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0);

  for (let v = 0; v < F.textureVariants; v++) {
    const mine = planks.filter((p) => p.variant === v);
    const mat = floorMaterials[v];
    mat.clippingPlanes = floorClipPlanes;
    const mesh = new THREE.InstancedMesh(geom, mat, mine.length);
    mine.forEach((p, i) => {
      // Plank long axis is local +x; rotation.y = −angle points it along (cos a, sin a) in (x, z).
      q.setFromAxisAngle(up, -p.angle);
      pos.set(mm(p.cx), 0, mm(p.cz));
      mesh.setMatrixAt(i, m4.compose(pos, q, one));
      mesh.setColorAt(i, col.setRGB(p.tone * (1 + p.warmth), p.tone, p.tone * (1 - p.warmth)));
    });
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  }
  group.userData.count = planks.length;
  return group;
}
