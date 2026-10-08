// Ceiling pendant: rose, flex, lamp holder and one of three shade styles, with a warm point light.
import * as THREE from 'three';
import { CONFIG } from '../config';
import { M } from '../materials/library';
import type { State } from '../state';
import { mm } from '../units';

export interface PendantRefs {
  group: THREE.Group;
  light: THREE.PointLight;
  glow: THREE.MeshStandardMaterial[];
}

export const PENDANT_OPTIONS = {
  'linen-drum': 'Linen drum Ø450',
  'rattan-dome': 'Rattan dome Ø500',
  'opal-globe': 'Opal glass globe Ø300',
} as const;

export function buildPendant(s: State): PendantRefs {
  const group = new THREE.Group();
  group.name = 'pendant';
  const ceil = CONFIG.room.ceiling;
  const P = CONFIG.pendant;
  group.position.set(mm(P.x), 0, mm(P.z));
  const bottom = ceil - s.lighting.pendantDrop;
  const glow: THREE.MeshStandardMaterial[] = [];

  const rose = new THREE.Mesh(new THREE.CylinderGeometry(mm(55), mm(55), mm(25), 32), M.flex);
  rose.position.y = mm(ceil - 12.5);
  group.add(rose);

  let shadeTop: number;
  let bulbY: number;
  switch (s.lighting.pendantStyle) {
    case 'linen-drum': {
      shadeTop = bottom + 250;
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(mm(225), mm(225), mm(250), 64, 1, true), M.linen);
      drum.position.y = mm(bottom + 125);
      const diffuser = new THREE.Mesh(new THREE.CircleGeometry(mm(222), 48), M.diffuser);
      diffuser.rotation.x = Math.PI / 2;
      diffuser.position.y = mm(bottom + 2);
      group.add(drum, diffuser);
      glow.push(M.linen, M.diffuser);
      bulbY = bottom + 110;
      break;
    }
    case 'rattan-dome': {
      shadeTop = bottom + 250;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(mm(250), 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.rattan);
      dome.position.y = mm(bottom);
      group.add(dome);
      bulbY = bottom + 80;
      break;
    }
    case 'opal-globe': {
      shadeTop = bottom + 300;
      const globe = new THREE.Mesh(new THREE.SphereGeometry(mm(150), 48, 32), M.opal);
      globe.position.y = mm(bottom + 150);
      group.add(globe);
      glow.push(M.opal);
      bulbY = bottom + 150;
      break;
    }
  }

  const flexLen = ceil - 25 - shadeTop;
  const flex = new THREE.Mesh(new THREE.CylinderGeometry(mm(3), mm(3), mm(flexLen), 8), M.flex);
  flex.position.y = mm(shadeTop + flexLen / 2);
  const holder = new THREE.Mesh(new THREE.CylinderGeometry(mm(18), mm(18), mm(60), 16), M.flex);
  holder.position.y = mm(shadeTop - 10);
  group.add(flex, holder);

  // Shades don't cast shadows so the light reaches the whole room.
  group.traverse((o) => {
    o.castShadow = false;
  });

  const light = new THREE.PointLight('#FFC58F', 0, 0, 2);
  light.position.y = mm(bulbY);
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.near = 0.05;
  light.shadow.bias = -0.002;
  light.shadow.camera.layers.enable(1);
  group.add(light);

  return { group, light, glow };
}
