// Pencil-pleat curtain pair with blackout lining on a pole (rings, finials, brackets) or a track.
// Built in window-wall space: local x = along the wall (a), y = up (b), z = outwards (c).
import * as THREE from 'three';
import { CONFIG } from '../config';
import { curtainLayout, curtainSettingsFrom, curtainSpan, foldAmplitude, type CurtainLayout } from '../lib/curtains';
import { mulberry32 } from '../lib/rng';
import { M } from '../materials/library';
import { dataTexture, velvetCanvas } from '../materials/textures';
import type { State } from '../state';
import { mm } from '../units';
import { WALLS, wallPoint, wallQuaternion } from './walls';

export interface CurtainRefs {
  group: THREE.Group;
  layout: CurtainLayout | null;
  /** open: 0 = closed … 100 = fully open. */
  update: (open: number) => void;
}

const CC = CONFIG.curtains;
const velvet = new THREE.MeshPhysicalMaterial({
  color: CC.fabric.colour,
  roughness: 0.9,
  sheen: 1,
  sheenRoughness: 0.42,
  sheenColor: new THREE.Color(CC.fabric.sheen),
  side: THREE.FrontSide,
  shadowSide: THREE.DoubleSide,
});
const lining = new THREE.MeshStandardMaterial({ color: CC.fabric.lining, roughness: 0.9, side: THREE.BackSide });
const hardware = new THREE.MeshStandardMaterial({ color: '#A0824F', metalness: 1, roughness: 0.38 });
let textured = false;

function applyMaterials(s: State): void {
  if (!textured) {
    const tex = dataTexture(velvetCanvas(31), [2, 2]);
    velvet.map = tex;
    velvet.bumpMap = tex;
    velvet.bumpScale = 0.5;
    velvet.needsUpdate = true;
    textured = true;
  }
  // The texture averages ~0.8, so lift the colour to keep the chosen shade.
  velvet.color.set(s.curtains.colour).multiplyScalar(1.22);
  velvet.sheenColor.set(s.curtains.colour).lerp(new THREE.Color('#ffffff'), 0.28);
  const f = CC.finishes[s.curtains.finish];
  hardware.color.set(f.colour);
  hardware.metalness = f.metalness;
  hardware.roughness = f.roughness;
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** One curtain: a pleated sheet anchored at one end of the pole, leading edge towards the centre. */
class CurtainPanel {
  readonly geo = new THREE.BufferGeometry();
  private readonly nu: number;
  private readonly nv: number;
  private readonly heights: number[];
  private readonly foldMul: number[];
  readonly rings: THREE.InstancedMesh | null;

  constructor(
    private readonly L: CurtainLayout,
    private readonly anchor: number,
    private readonly dir: 1 | -1,
    seed: number,
    group: THREE.Group,
    withRings: boolean,
  ) {
    this.nu = L.folds * 20 + 1;
    this.nv = 34;
    const drop = L.top - L.bottom;
    // Rows bunched towards the top so the pencil-pleat heading has detail.
    this.heights = Array.from({ length: this.nv }, (_, j) => L.top - Math.pow(j / (this.nv - 1), 1.6) * drop);
    const rng = mulberry32(seed);
    this.foldMul = Array.from({ length: L.folds + 1 }, () => 0.85 + rng() * 0.3);

    const count = this.nu * this.nv;
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const uv = new Float32Array(count * 2);
    const idx: number[] = [];
    for (let j = 0; j < this.nv; j++) {
      for (let i = 0; i < this.nu; i++) {
        const k = j * this.nu + i;
        uv[k * 2] = mm((i / (this.nu - 1)) * L.flatWidth);
        uv[k * 2 + 1] = mm(this.heights[j]);
        if (i < this.nu - 1 && j < this.nv - 1) {
          const a = k;
          const b = k + 1;
          const c = k + this.nu;
          const d = c + 1;
          // Front faces point into the room (−z) for the left-anchored curtain; mirrored for the right.
          if (dir === 1) idx.push(a, b, c, b, d, c);
          else idx.push(a, c, b, b, c, d);
        }
      }
    }
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geo.setIndex(idx);

    const front = new THREE.Mesh(this.geo, velvet);
    front.castShadow = true;
    front.receiveShadow = true;
    const back = new THREE.Mesh(this.geo, lining);
    back.receiveShadow = true;
    group.add(front, back);

    this.rings = null;
    if (withRings) {
      const ringGeo = new THREE.TorusGeometry(mm(CC.pole.ringRadius), mm(CC.pole.ringTube), 8, 24);
      ringGeo.rotateY(Math.PI / 2);
      this.rings = new THREE.InstancedMesh(ringGeo, hardware, L.folds + 1);
      this.rings.castShadow = true;
      this.rings.frustumCulled = false;
      group.add(this.rings);
    }
  }

  private mulAt(t: number): number {
    const x = t * this.L.folds;
    const i = Math.min(this.L.folds - 1, Math.floor(x));
    const f = x - i;
    const w = (1 - Math.cos(f * Math.PI)) / 2;
    return this.foldMul[i] * (1 - w) + this.foldMul[i + 1] * w;
  }

  update(span: number): void {
    const L = this.L;
    const N = L.folds;
    const A = foldAmplitude(L.flatWidth, span, N);
    const drop = L.top - L.bottom;
    const pos = this.geo.getAttribute('position') as THREE.BufferAttribute;
    for (let j = 0; j < this.nv; j++) {
      const y = this.heights[j];
      const fromTop = L.top - y;
      const main = A * (0.45 + 0.55 * smooth(0, 180, fromTop)) * (1 + 0.18 * (fromTop / drop));
      const pencil = 5 * (1 - smooth(CC.headingTape - 20, CC.headingTape + 20, fromTop));
      for (let i = 0; i < this.nu; i++) {
        const t = i / (this.nu - 1);
        const a = this.anchor + this.dir * span * t;
        const c = L.c + main * this.mulAt(t) * Math.sin(2 * Math.PI * N * t) + pencil * Math.sin(2 * Math.PI * 4 * N * t);
        pos.setXYZ(j * this.nu + i, mm(a), mm(y), mm(c));
      }
    }
    pos.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();

    if (this.rings) {
      const m4 = new THREE.Matrix4();
      const ringY = L.hardwareY - (CC.pole.ringRadius - CC.pole.diameter / 2);
      for (let k = 0; k <= N; k++) {
        m4.makeTranslation(mm(this.anchor + this.dir * span * (k / N)), mm(ringY), mm(L.c));
        this.rings.setMatrixAt(k, m4);
      }
      this.rings.instanceMatrix.needsUpdate = true;
    }
  }
}

function cyl(r: number, len: number, axis: 'x' | 'z', mat: THREE.Material): THREE.Mesh {
  const g = new THREE.CylinderGeometry(mm(r), mm(r), mm(len), 20);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  else g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildPole(group: THREE.Group, L: CurtainLayout): void {
  const P = CC.pole;
  const y = mm(L.hardwareY);
  const ext = 45; // pole beyond the end brackets
  const pole = cyl(P.diameter / 2, L.a1 - L.a0 + 2 * ext, 'x', hardware);
  pole.position.set(mm((L.a0 + L.a1) / 2), y, mm(L.c));
  group.add(pole);
  for (const [a, s] of [
    [L.a0 - ext, -1],
    [L.a1 + ext, 1],
  ] as const) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(mm(P.finial / 2), 24, 16), hardware);
    ball.position.set(mm(a + s * (P.finial / 2 + 8)), y, mm(L.c));
    const collar = cyl(P.diameter / 2 + 4, 16, 'x', hardware);
    collar.position.set(mm(a + s * 4), y, mm(L.c));
    ball.castShadow = true;
    group.add(ball, collar);
  }
  for (const a of [L.a0 - 22, (L.a0 + L.a1) / 2, L.a1 + 22]) {
    const arm = cyl(6, -L.c, 'z', hardware);
    arm.position.set(mm(a), y, mm(L.c / 2));
    const plate = cyl(26, 8, 'z', hardware);
    plate.position.set(mm(a), y, mm(-4));
    const cup = cyl(P.diameter / 2 + 3, 14, 'x', hardware);
    cup.position.set(mm(a), y, mm(L.c));
    group.add(arm, plate, cup);
  }
}

function buildTrack(group: THREE.Group, L: CurtainLayout): void {
  const T = CC.track;
  const track = new THREE.Mesh(new THREE.BoxGeometry(mm(L.a1 - L.a0 + 40), mm(T.h), mm(T.w)), M.upvc);
  track.position.set(mm((L.a0 + L.a1) / 2), mm(L.hardwareY + T.h / 2), mm(L.c));
  track.castShadow = true;
  group.add(track);
  const n = Math.max(3, Math.ceil((L.a1 - L.a0) / 450) + 1);
  for (let i = 0; i < n; i++) {
    const a = L.a0 + ((L.a1 - L.a0) * i) / (n - 1);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(mm(24), mm(10), mm(-L.c)), M.upvc);
    arm.position.set(mm(a), mm(L.hardwareY + T.h / 2), mm(L.c / 2));
    group.add(arm);
  }
}

export function buildCurtains(s: State): CurtainRefs {
  const group = new THREE.Group();
  group.name = 'curtains';
  if (!s.curtains.enabled) return { group, layout: null, update: () => {} };
  applyMaterials(s);
  const w = WALLS.window;
  group.quaternion.copy(wallQuaternion(w));
  group.position.copy(wallPoint(w, 0, 0, 0));

  const L = curtainLayout(curtainSettingsFrom(s));
  const pole = s.curtains.hardware === 'pole';
  if (pole) buildPole(group, L);
  else buildTrack(group, L);
  const panels = [new CurtainPanel(L, L.a0, 1, 11, group, pole), new CurtainPanel(L, L.a1, -1, 29, group, pole)];

  const update = (open: number) => {
    const span = curtainSpan(L, open);
    for (const p of panels) p.update(span);
  };
  update(s.curtains.open);
  return { group, layout: L, update };
}
