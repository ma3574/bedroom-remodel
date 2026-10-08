// Generic dressing table with stool and optional freestanding mirror. Always faces into the room.
import * as THREE from 'three';
import { CONFIG } from '../config';
import { boxMM, roundedBoxMM } from '../geom';
import { dressingRect } from '../layout';
import { M } from '../materials/library';
import type { State } from '../state';
import { mm } from '../units';

export interface DressingRefs {
  group: THREE.Group;
  stool: THREE.Group;
  mirror: THREE.Group;
}

function taperedLeg(h: number, top: number, bottom: number, mat: THREE.Material): THREE.Mesh {
  const g = new THREE.CylinderGeometry(mm(top / Math.SQRT2), mm(bottom / Math.SQRT2), mm(h), 4, 1);
  g.rotateY(Math.PI / 4);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

export function buildDressingTable(s: State): DressingRefs {
  const group = new THREE.Group();
  group.name = 'dressing';
  const { w, d } = s.dressing;
  const h = CONFIG.dressingTable.h;
  // Local frame: x across (−w/2..w/2), z from the wall (0) to the front (d).
  const local = new THREE.Group();
  const topT = 25;
  const apronH = 120;
  local.add(roundedBoxMM([-w / 2, h - topT, 0], [w / 2, h, d], 4, M.oak));
  local.add(boxMM([-w / 2 + 30, h - topT - apronH, 20], [w / 2 - 30, h - topT, d - 20], M.oak));
  // Two drawer fronts with a shadow gap between them.
  const df = d - 18;
  local.add(
    boxMM([-w / 2 + 34, h - topT - apronH + 6, df], [-3, h - topT - 6, df + 2], M.oak),
    boxMM([3, h - topT - apronH + 6, df], [w / 2 - 34, h - topT - 6, df + 2], M.oak),
  );
  for (const [x, z] of [
    [-w / 2 + 50, 50],
    [w / 2 - 50, 50],
    [-w / 2 + 50, d - 50],
    [w / 2 - 50, d - 50],
  ]) {
    const leg = taperedLeg(h - topT, 42, 26, M.oak);
    leg.position.set(mm(x), mm((h - topT) / 2), mm(z));
    local.add(leg);
  }

  const stool = new THREE.Group();
  stool.add(roundedBoxMM([-225, 370, -175], [225, 450, 175], 25, M.stoolFabric, 4));
  for (const [x, z] of [
    [-190, -140],
    [190, -140],
    [-190, 140],
    [190, 140],
  ]) {
    const leg = taperedLeg(370, 32, 22, M.oak);
    leg.position.set(mm(x), mm(185), mm(z));
    stool.add(leg);
  }
  stool.position.set(0, 0, mm(d - 60));
  local.add(stool);

  const mirror = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.TorusGeometry(mm(1), mm(0.04), 8, 64), M.brass);
  frame.scale.set(mm(200), mm(300), mm(200));
  const glass = new THREE.Mesh(new THREE.CircleGeometry(mm(1), 64), M.mirror);
  glass.scale.set(mm(196), mm(296), 1);
  glass.position.z = mm(1);
  const oval = new THREE.Group();
  oval.add(frame, glass);
  oval.position.set(0, mm(h + 60 + 300), mm(120));
  oval.rotation.x = -0.08;
  const stand = boxMM([-60, h, 60], [60, h + 70, 140], M.brass);
  mirror.add(oval, stand);
  local.add(mirror);

  local.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const r = dressingRect(s);
  const g = CONFIG.furnitureWallGap;
  const R = CONFIG.room;
  if (s.dressing.wall === 'window') {
    local.position.set(mm(R.width - g), 0, mm((r.z0 + r.z1) / 2));
    local.rotation.y = -Math.PI / 2;
  } else if (s.dressing.wall === 'door') {
    local.position.set(mm(g), 0, mm((r.z0 + r.z1) / 2));
    local.rotation.y = Math.PI / 2;
  } else {
    local.position.set(mm((r.x0 + r.x1) / 2), 0, mm(g));
  }
  group.add(local);
  return { group, stool, mirror };
}
