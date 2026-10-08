// Simplified models of the IKEA handle options (for comparing size, finish and position).
// Local frame: long axis along +y, protruding towards +z, origin on the mounting surface.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { M } from '../materials/library';
import type { HandleId } from '../state';
import { mm } from '../units';

export const HANDLE_OPTIONS: Record<HandleId, string> = {
  'bagganas-brass-335': 'BAGGANÄS brass 335mm',
  'bagganas-black-143': 'BAGGANÄS black 143mm',
  'kallror-steel-405': 'KALLRÖR stainless 405mm',
  'hamphult-oak-146': 'HAMPHULT oak 146mm',
  'eneryda-brass-35': 'ENERYDA brass knob Ø35',
  'osternas-leather-65': 'ÖSTERNÄS leather 65mm',
  none: 'None (push-to-open)',
};

function post(y: number, standoff: number, r: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(mm(r), mm(r), mm(standoff), 16), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(0, mm(y), mm(standoff / 2));
  return m;
}

function roundBar(length: number, cc: number, dia: number, standoff: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CapsuleGeometry(mm(dia / 2), mm(length - dia), 6, 16), mat);
  bar.position.z = mm(standoff);
  g.add(bar, post(cc / 2, standoff, dia * 0.4, mat), post(-cc / 2, standoff, dia * 0.4, mat));
  return g;
}

function flatBar(length: number, cc: number, width: number, thick: number, standoff: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const bar = new THREE.Mesh(new RoundedBoxGeometry(mm(width), mm(length), mm(thick), 2, mm(1.5)), mat);
  bar.position.z = mm(standoff);
  g.add(bar, post(cc / 2, standoff, 4, mat), post(-cc / 2, standoff, 4, mat));
  return g;
}

function knob(dia: number, mat: THREE.Material): THREE.Group {
  const r = dia / 2;
  const pts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(7, 0),
    new THREE.Vector2(6, 12),
    new THREE.Vector2(r * 0.8, 16),
    new THREE.Vector2(r, 22),
    new THREE.Vector2(r * 0.85, 28),
    new THREE.Vector2(0, 30),
  ].map((p) => new THREE.Vector2(mm(p.x), mm(p.y)));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), mat);
  m.rotation.x = Math.PI / 2; // lathe axis y → z
  const g = new THREE.Group();
  g.add(m);
  return g;
}

function leatherLoop(length: number): THREE.Group {
  const g = new THREE.Group();
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, mm(length / 2), 0),
    new THREE.Vector3(0, 0, mm(44)),
    new THREE.Vector3(0, mm(-length / 2), 0),
  );
  const strap = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, mm(2.5), 8), M.leather);
  strap.scale.x = 4.5; // flatten into a ~22mm wide strap
  g.add(strap);
  for (const y of [length / 2, -length / 2]) {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(mm(4.5), mm(4.5), mm(4), 16), M.brass);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(0, mm(y), mm(3));
    g.add(screw);
  }
  return g;
}

export function makeHandle(id: HandleId): THREE.Group | null {
  let g: THREE.Group;
  switch (id) {
    case 'bagganas-brass-335':
      g = roundBar(335, 320, 12, 32, M.brass);
      break;
    case 'bagganas-black-143':
      g = roundBar(143, 128, 12, 32, M.black);
      break;
    case 'kallror-steel-405':
      g = flatBar(405, 320, 12, 6, 30, M.steel);
      break;
    case 'hamphult-oak-146': {
      g = new THREE.Group();
      const bar = new THREE.Mesh(new RoundedBoxGeometry(mm(22), mm(146), mm(18), 3, mm(5)), M.handleOak);
      bar.position.z = mm(26);
      g.add(bar, post(64, 18, 7, M.handleOak), post(-64, 18, 7, M.handleOak));
      break;
    }
    case 'eneryda-brass-35':
      g = knob(35, M.brass);
      break;
    case 'osternas-leather-65':
      g = leatherLoop(65);
      break;
    case 'none':
      return null;
  }
  g.traverse((o) => {
    o.castShadow = true;
  });
  return g;
}
