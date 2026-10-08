// Pesaro oak doors: hinged main door and the ensuite pocket door, with hardware.
import * as THREE from 'three';
import { CONFIG, OPENINGS } from '../config';
import { boxMM } from '../geom';
import { M } from '../materials/library';
import { mm } from '../units';

export interface DoorRefs {
  group: THREE.Group;
  mainPivot: THREE.Object3D;
  pocketLeaf: THREE.Object3D;
}

function leafMesh(t: number, h: number, w: number): THREE.Mesh {
  // Faces ±x carry the Pesaro photo; the four edges are plain oak.
  const mats = [M.pesaroFace, M.pesaroFace, M.oakEdge, M.oakEdge, M.oakEdge, M.oakEdge];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(mm(t), mm(h), mm(w)), mats);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Lever on rose. side = +1 for a face at +x, −1 for −x. Lever points towards −z (the hinge side). */
function lever(side: 1 | -1): THREE.Group {
  const g = new THREE.Group();
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(mm(26), mm(26), mm(8), 32), M.chrome);
  rose.rotation.z = Math.PI / 2;
  rose.position.x = mm(4 * side);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(mm(8), mm(8), mm(50), 16), M.chrome);
  neck.rotation.z = Math.PI / 2;
  neck.position.x = mm(30 * side);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(mm(9), mm(115), 4, 12), M.chrome);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(mm(55 * side), 0, mm(-60));
  g.add(rose, neck, arm);
  for (const o of g.children) o.castShadow = true;
  return g;
}

export function buildDoors(): DoorRefs {
  const group = new THREE.Group();
  group.name = 'doors';

  // Main door: pivot on the room face at the bed-wall end of the opening.
  const MD = CONFIG.mainDoor;
  const { main, ensuite } = OPENINGS;
  const mainPivot = new THREE.Group();
  mainPivot.position.set(0, 0, mm(main.a0 + 3));
  const leaf = leafMesh(MD.leaf.t, MD.leaf.h, MD.leaf.w);
  leaf.position.set(mm(-MD.leaf.t / 2), mm(MD.floorGap + MD.leaf.h / 2), mm(MD.leaf.w / 2));
  mainPivot.add(leaf);
  const hz = mm(MD.leaf.w - MD.handle.inset);
  const hy = mm(MD.handle.height);
  const inside = lever(1);
  inside.position.set(0, hy, hz);
  const outside = lever(-1);
  outside.position.set(mm(-MD.leaf.t), hy, hz);
  mainPivot.add(inside, outside);
  for (const y of [225, MD.leaf.h / 2, MD.leaf.h - 150]) {
    mainPivot.add(boxMM([-MD.leaf.t + 4, MD.floorGap + y - 50, -2], [-4, MD.floorGap + y + 50, 0], M.chrome));
  }
  group.add(mainPivot);

  // Ensuite pocket door: leaf centred in the 125mm wall, slides +z into the cavity.
  const ED = CONFIG.ensuiteDoor;
  const wallT = CONFIG.wallThickness.door;
  const pocketLeaf = new THREE.Group();
  pocketLeaf.position.set(mm(-wallT / 2), 0, mm(ensuite.a0));
  const pl = leafMesh(ED.leaf.t, ED.leaf.h, ED.leaf.w);
  pl.position.set(0, mm(ED.floorGap + ED.leaf.h / 2), mm(ED.leaf.w / 2));
  pocketLeaf.add(pl);
  // Flush pulls near the leading edge on both faces, plus an edge pull.
  const pz = ED.pull.inset;
  const py = ED.pull.height;
  for (const side of [1, -1]) {
    const x0 = (side * ED.leaf.t) / 2;
    pocketLeaf.add(
      boxMM([Math.min(x0, x0 + side * 1.5), py - 80, pz - 15], [Math.max(x0, x0 + side * 1.5), py + 80, pz + 15], M.darkChrome),
    );
  }
  pocketLeaf.add(boxMM([-12, py - 60, -1.5], [12, py + 60, 0], M.darkChrome));
  group.add(pocketLeaf);

  return { group, mainPivot, pocketLeaf };
}
