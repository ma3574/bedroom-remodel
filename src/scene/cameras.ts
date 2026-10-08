// Orbit + plan (orthographic) cameras, smooth preset moves and first-person walk mode.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CONFIG } from '../config';
import type { CameraPreset } from '../state';
import { clamp, mm } from '../units';

const R = CONFIG.room;
const centre = new THREE.Vector3(mm(R.width / 2), 1.0, mm(R.depth / 2));
// Plan view is nudged so the room sits clear of the control panel (right) and HUD (bottom).
const planCentre = new THREE.Vector3(centre.x + 0.45, 0, centre.z + 0.25);

interface PresetPose {
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
  /** Interior views orbit around a point just in front of the eye (look-around). */
  interior?: boolean;
  fov?: number;
}

export const CAMERA_PRESETS: Record<CameraPreset, PresetPose> = {
  corner: { label: 'Corner 3/4 (overview)', pos: [-2.0, 5.4, -2.4], target: [2.3, 0.3, 2.6] },
  plan: { label: 'Plan (top-down)', pos: [2.1, 12, 2.275], target: [2.1, 0, 2.275] },
  doorway: { label: 'From the main door', pos: [0.2, 1.6, 0.6], target: [4.0, 1.0, 3.2], interior: true, fov: 68 },
  bed: { label: 'Sitting up in bed', pos: [2.28, 1.15, 0.45], target: [2.15, 1.0, 4.5], interior: true, fov: 68 },
  ensuite: { label: 'From the ensuite door', pos: [0.25, 1.6, 2.6], target: [4.2, 1.0, 0.6], interior: true, fov: 68 },
  wardrobes: { label: 'Facing the wardrobes', pos: [2.1, 1.55, 2.0], target: [2.1, 1.25, 4.55], interior: true, fov: 72 },
  window: { label: 'Looking at the window', pos: [0.6, 1.6, 3.6], target: [4.2, 1.2, 1.8], interior: true, fov: 68 },
};

export class CameraRig {
  readonly persp: THREE.PerspectiveCamera;
  readonly ortho: THREE.OrthographicCamera;
  readonly orbit: OrbitControls;
  readonly planControls: OrbitControls;
  readonly walk: PointerLockControls;
  mode: 'orbit' | 'plan' | 'walk' = 'orbit';
  eyeHeight = 1.65;
  onWalkExit: () => void = () => {};

  private tween: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; t: number } | null = null;
  private keys = new Set<string>();

  constructor(private dom: HTMLElement) {
    const aspect = dom.clientWidth / dom.clientHeight;
    this.persp = new THREE.PerspectiveCamera(55, aspect, 0.02, 100);
    this.persp.position.set(...CAMERA_PRESETS.corner.pos);
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
    this.ortho.up.set(0, 0, -1); // bed wall at the top of the screen, like the PDF
    this.ortho.position.set(planCentre.x, 12, planCentre.z);
    this.ortho.lookAt(planCentre.x, 0, planCentre.z);
    this.fitOrtho();

    this.orbit = new OrbitControls(this.persp, dom);
    this.orbit.enableDamping = true;
    this.orbit.maxPolarAngle = Math.PI * 0.495;
    this.orbit.target.set(...CAMERA_PRESETS.corner.target);
    this.orbit.update();

    this.planControls = new OrbitControls(this.ortho, dom);
    this.planControls.enableRotate = false;
    this.planControls.screenSpacePanning = true;
    this.planControls.target.copy(planCentre);
    this.planControls.enabled = false;

    this.walk = new PointerLockControls(this.persp, dom);
    this.walk.addEventListener('unlock', () => {
      if (this.mode === 'walk') this.onWalkExit();
    });
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  get camera(): THREE.Camera {
    return this.mode === 'plan' ? this.ortho : this.persp;
  }

  fitOrtho(): void {
    const aspect = this.dom.clientWidth / Math.max(1, this.dom.clientHeight);
    const margin = 0.9;
    const w = mm(R.width) + margin * 2;
    const h = mm(R.depth) + margin * 2;
    const halfH = Math.max(h / 2, w / 2 / aspect);
    this.ortho.left = -halfH * aspect;
    this.ortho.right = halfH * aspect;
    this.ortho.top = halfH;
    this.ortho.bottom = -halfH;
    this.ortho.updateProjectionMatrix();
  }

  resize(): void {
    this.persp.aspect = this.dom.clientWidth / this.dom.clientHeight;
    this.persp.updateProjectionMatrix();
    this.fitOrtho();
  }

  setPreset(name: CameraPreset, animate = true): void {
    this.exitWalk();
    const p = CAMERA_PRESETS[name];
    if (name === 'plan') {
      this.mode = 'plan';
      this.orbit.enabled = false;
      this.planControls.enabled = true;
      this.ortho.zoom = 1;
      this.planControls.target.copy(planCentre);
      this.ortho.position.set(planCentre.x, 12, planCentre.z);
      this.ortho.updateProjectionMatrix();
      this.planControls.update();
      return;
    }
    this.mode = 'orbit';
    this.planControls.enabled = false;
    this.orbit.enabled = true;
    const pos = new THREE.Vector3(...p.pos);
    let tgt = new THREE.Vector3(...p.target);
    if (p.interior) tgt = pos.clone().add(tgt.sub(pos).normalize().multiplyScalar(0.6));
    this.orbit.minDistance = p.interior ? 0.1 : 0.5;
    this.persp.fov = p.fov ?? 55;
    this.persp.updateProjectionMatrix();
    if (!animate) {
      this.persp.position.copy(pos);
      this.orbit.target.copy(tgt);
      this.orbit.update();
      return;
    }
    this.tween = { from: this.persp.position.clone(), to: pos, tFrom: this.orbit.target.clone(), tTo: tgt, t: 0 };
  }

  enterWalk(): void {
    this.tween = null;
    this.mode = 'walk';
    this.orbit.enabled = false;
    this.planControls.enabled = false;
    const p = this.persp.position;
    p.set(clamp(p.x, 0.3, mm(R.width) - 0.3), this.eyeHeight, clamp(p.z, 0.3, 3.7));
    // Look level, keeping the current heading.
    const dir = new THREE.Vector3();
    this.persp.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
    this.persp.lookAt(p.clone().add(dir));
    this.walk.lock();
  }

  exitWalk(): void {
    if (this.mode !== 'walk') return;
    this.mode = 'orbit';
    if (this.walk.isLocked) this.walk.unlock();
    this.orbit.enabled = true;
    const dir = new THREE.Vector3();
    this.persp.getWorldDirection(dir);
    this.orbit.target.copy(this.persp.position).addScaledVector(dir, 0.6);
    this.orbit.minDistance = 0.1;
    this.orbit.update();
  }

  update(dt: number): void {
    if (this.tween) {
      this.tween.t = Math.min(1, this.tween.t + dt / 0.8);
      const k = this.tween.t < 0.5 ? 4 * this.tween.t ** 3 : 1 - (-2 * this.tween.t + 2) ** 3 / 2;
      this.persp.position.lerpVectors(this.tween.from, this.tween.to, k);
      this.orbit.target.lerpVectors(this.tween.tFrom, this.tween.tTo, k);
      if (this.tween.t >= 1) this.tween = null;
    }
    if (this.mode === 'walk') {
      const speed = (this.keys.has('ShiftLeft') ? 2.4 : 1.4) * dt;
      const f = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
      const r = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
      if (f) this.walk.moveForward(f * speed);
      if (r) this.walk.moveRight(r * speed);
      const p = this.persp.position;
      p.x = clamp(p.x, 0.2, mm(R.width) - 0.2);
      p.z = clamp(p.z, 0.2, 3.75);
      p.y = this.eyeHeight;
    } else if (this.mode === 'plan') {
      this.planControls.update();
    } else {
      this.orbit.update();
    }
  }
}
