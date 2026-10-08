import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mm } from './units';

type V3 = [number, number, number];

/** Axis-aligned box between two corners given in millimetres (any local frame). */
export function boxMM(min: V3, max: V3, mat: THREE.Material | THREE.Material[], cast = true): THREE.Mesh {
  const g = new THREE.BoxGeometry(mm(max[0] - min[0]), mm(max[1] - min[1]), mm(max[2] - min[2]));
  const m = new THREE.Mesh(g, mat);
  m.position.set(mm((min[0] + max[0]) / 2), mm((min[1] + max[1]) / 2), mm((min[2] + max[2]) / 2));
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

/** Rounded box between two corners (mm) with edge radius r (mm). */
export function roundedBoxMM(min: V3, max: V3, r: number, mat: THREE.Material, segments = 3, cast = true): THREE.Mesh {
  const sx = max[0] - min[0];
  const sy = max[1] - min[1];
  const sz = max[2] - min[2];
  const radius = Math.min(r, sx / 2 - 0.01, sy / 2 - 0.01, sz / 2 - 0.01);
  const g = new RoundedBoxGeometry(mm(sx), mm(sy), mm(sz), segments, mm(Math.max(0.01, radius)));
  const m = new THREE.Mesh(g, mat);
  m.position.set(mm((min[0] + max[0]) / 2), mm((min[1] + max[1]) / 2), mm((min[2] + max[2]) / 2));
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

export function shadowAll(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
}

/** Dispose geometries (and any materials flagged as owned) under an object. */
export function disposeTree(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (o.userData.ownMaterial) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) m?.dispose();
    }
  });
}

export function setLayerRecursive(obj: THREE.Object3D, layer: number): void {
  obj.traverse((o) => o.layers.set(layer));
}
