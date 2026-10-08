// Daikin FTXP25M wall-mounted indoor unit (770 × 286 × 225) with an opening flap and airflow fan.
// Local frame: origin at the unit's underside centre on the bed wall; +z towards the room.
import * as THREE from 'three';
import { CONFIG } from '../config';
import { boxMM, roundedBoxMM } from '../geom';
import { acPlacement } from '../lib/aircon';
import type { State } from '../state';
import { deg, mm } from '../units';

export interface AirconRefs {
  group: THREE.Group;
  /** t = 0 (off, flap shut) … 1 (running, flap fully open). */
  update: (t: number) => void;
}

const A = CONFIG.aircon;
const shell = new THREE.MeshStandardMaterial({ color: '#F6F6F3', roughness: 0.32 });
const grille = new THREE.MeshStandardMaterial({ color: '#D9D9D5', roughness: 0.6 });
const outlet = new THREE.MeshStandardMaterial({ color: '#2E3133', roughness: 0.7 });
const led = new THREE.MeshStandardMaterial({ color: '#3A3D3F', emissive: '#8CFFC0', emissiveIntensity: 0, roughness: 0.3 });
let airMat: THREE.MeshBasicMaterial | null = null;

function airflowMaterial(): THREE.MeshBasicMaterial {
  if (airMat) return airMat;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  // alphaMap reads the green channel, so draw an opaque ramp. With flipY, canvas row 0 is v = 1 (the outlet).
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgb(255,255,255)');
  g.addColorStop(0.45, 'rgb(90,90,90)');
  g.addColorStop(1, 'rgb(0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  airMat = new THREE.MeshBasicMaterial({
    color: '#9FD3FF',
    alphaMap: tex,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return airMat;
}

/** Widening sheet of air leaving the outlet, tipped `angle` below horizontal (v = 1 at the outlet). */
function airSheet(angle: number, length: number, w0: number, w1: number): THREE.Mesh {
  const dir = new THREE.Vector3(0, -Math.sin(deg(angle)), Math.cos(deg(angle)));
  const near = new THREE.Vector3(0, mm(10), mm(A.d - 20));
  const far = near.clone().addScaledVector(dir, mm(length));
  const pos = [
    -mm(w0 / 2), near.y, near.z,
    mm(w0 / 2), near.y, near.z,
    -mm(w1 / 2), far.y, far.z,
    mm(w1 / 2), far.y, far.z,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  const m = new THREE.Mesh(g, airflowMaterial());
  m.castShadow = false;
  m.receiveShadow = false;
  m.renderOrder = 5;
  return m;
}

export function buildAircon(s: State): AirconRefs {
  const group = new THREE.Group();
  group.name = 'aircon';
  const p = acPlacement(s.aircon.gapToWindowWall, s.aircon.gapToCeiling);
  group.position.set(mm((p.x0 + p.x1) / 2), mm(p.y0), mm(p.z0));

  const hw = A.w / 2;
  // Body, top intake grille, bottom outlet and a small status window.
  group.add(roundedBoxMM([-hw, 0, 0], [hw, A.h, A.d], 14, shell, 4));
  group.add(boxMM([-hw + 30, A.h - 0.5, 25], [hw - 30, A.h + 0.8, A.d - 30], grille, false));
  for (let i = 0; i < 18; i++) {
    const z = 35 + i * 9;
    group.add(boxMM([-hw + 34, A.h + 0.8, z], [hw - 34, A.h + 1.2, z + 3], outlet, false));
  }
  const outW = 640;
  group.add(boxMM([-outW / 2, 4, A.d - 70], [outW / 2, 8, A.d - 4], outlet, false));
  group.add(boxMM([-outW / 2, 8, A.d - 0.5], [outW / 2, 72, A.d + 0.5], outlet, false));
  group.add(boxMM([hw - 95, 92, A.d - 0.3], [hw - 55, 104, A.d + 1.2], led, false));

  // Flap hinged along its top edge at the front of the outlet; opens outwards and up.
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, mm(76), mm(A.d + 1.5));
  const flap = roundedBoxMM([-outW / 2 - 6, -70, 0], [outW / 2 + 6, 0, 4], 1.5, shell, 2);
  flapPivot.add(flap);
  group.add(flapPivot);

  // Airflow (only visible when running).
  const air = new THREE.Group();
  for (const [angle, len] of [
    [A.airflowAngle - 10, 2000],
    [A.airflowAngle, 2300],
    [A.airflowAngle + 10, 2000],
  ] as const) {
    air.add(airSheet(angle, len, 620, 1500));
  }
  group.add(air);

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.parent !== air) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const update = (t: number) => {
    flapPivot.rotation.x = -deg(A.flapMaxAngle * t);
    led.emissiveIntensity = t > 0.05 ? 1.2 : 0;
    air.visible = t > 0.05;
    if (airMat) airMat.opacity = 0.3 * t;
    air.scale.setScalar(0.4 + 0.6 * t);
  };
  update(s.aircon.running ? 1 : 0);
  return { group, update };
}
