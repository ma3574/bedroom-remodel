import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { CONFIG, OPENINGS } from './config';
import { buildAircon, type AirconRefs } from './furniture/aircon';
import { buildBed, type BedRefs } from './furniture/bed';
import { buildBedsideTables, type BedsideRefs } from './furniture/bedsideTable';
import { buildDressingTable, type DressingRefs } from './furniture/dressingTable';
import { buildPendant, type PendantRefs } from './furniture/pendant';
import { buildWardrobes, type WardrobeRefs } from './furniture/wardrobes';
import { disposeTree } from './geom';
import { wardrobeDims } from './layout';
import { acFit } from './lib/aircon';
import { blindSummary } from './lib/blinds';
import { curtainSummary } from './lib/curtains';
import { fitCheck } from './lib/fit';
import { applyColours, initTextures } from './materials/library';
import { buildOverlays } from './overlays/overlays';
import { buildBlinds, type BlindRefs } from './room/blinds';
import { buildCurtains, type CurtainRefs } from './room/curtains';
import { buildDoors } from './room/doors';
import { buildFloor } from './room/floor';
import { buildShell } from './room/shell';
import { CAMERA_PRESETS, CameraRig } from './scene/cameras';
import { resetCutaway, updateCutaway } from './scene/cutaway';
import { applyLighting, createLights } from './scene/lighting';
import { clearSavedState, defaultState, loadInitialState, mergeInto, saveState, shareUrl, type CameraPreset } from './state';
import { buildGui, type Section } from './ui/gui';
import { setHudFit, setHudHint, setHudView, toast } from './ui/hud';
import { deg, mm } from './units';

const container = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.localClippingEnabled = true;
container.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.setSize(container.clientWidth, container.clientHeight);
labels.domElement.className = 'labels';
container.appendChild(labels.domElement);

const state = loadInitialState();
const scene = new THREE.Scene();
initTextures(renderer, () => {});
applyColours(state);
const lights = createLights(scene, renderer);
const shell = buildShell();
scene.add(shell.group);
const doors = buildDoors();
scene.add(doors.group);
const rig = new CameraRig(renderer.domElement);
rig.eyeHeight = mm(state.view.eyeHeight);

// ---- Rebuildable sections -------------------------------------------------
let floor: THREE.Group | null = null;
let wardrobes: WardrobeRefs | null = null;
let bed: BedRefs | null = null;
let bedside: BedsideRefs | null = null;
let dressing: DressingRefs | null = null;
let pendant: PendantRefs | null = null;
let overlays: THREE.Group | null = null;
let blinds: BlindRefs | null = null;
let blindsForce = true;
// Blinds live in the window-wall group so they hide (but still cast shadows) with that wall.
const blindsHolder = new THREE.Group();
shell.wallGroups.window.add(blindsHolder);
let aircon: AirconRefs | null = null;
let curtains: CurtainRefs | null = null;
let curtainsForce = true;
const curtainsHolder = new THREE.Group();
shell.wallGroups.window.add(curtainsHolder);

function swap<T extends THREE.Object3D>(old: T | null | undefined, next: T): T {
  if (old) {
    scene.remove(old);
    disposeTree(old);
  }
  scene.add(next);
  return next;
}

function updateFit(): void {
  const d = wardrobeDims(state);
  const fit = fitCheck(CONFIG.room.ceiling, d.base, d.frameH);
  gui.setFit(`${fit.level === 'ok' ? '✓' : fit.level === 'warn' ? '⚠' : '✕'} ${fit.message}`);
  setHudFit(fit, d);
}

function applyVisibility(): void {
  if (bed) {
    bed.group.visible = state.show.bed;
    bed.bedding.visible = state.show.bedding;
  }
  if (bedside) {
    bedside.group.visible = state.show.bedsideTables;
    bedside.lamps.visible = state.show.lamps;
  }
  if (dressing) {
    dressing.group.visible = state.show.dressingTable;
    dressing.stool.visible = state.show.stool;
    dressing.mirror.visible = state.show.mirror;
  }
  if (wardrobes) {
    wardrobes.group.visible = state.show.wardrobes;
    wardrobes.fillers.visible = state.show.fillers;
  }
  if (pendant) pendant.group.visible = state.show.pendant;
  if (aircon) aircon.group.visible = state.show.aircon;
  doors.group.visible = state.show.doors;
}

const BUILD_ORDER: Section[] = ['floor', 'wardrobes', 'bed', 'bedside', 'dressing', 'blinds', 'curtains', 'aircon', 'pendant', 'visibility', 'colours', 'lighting', 'overlays'];
const dirty = new Set<Section>(BUILD_ORDER);

function processDirty(): void {
  if (!dirty.size) return;
  for (const s of BUILD_ORDER) {
    if (!dirty.has(s)) continue;
    dirty.delete(s);
    switch (s) {
      case 'floor':
        floor = swap(floor, buildFloor(state));
        break;
      case 'wardrobes': {
        const next = buildWardrobes(state);
        if (wardrobes) {
          scene.remove(wardrobes.group);
          disposeTree(wardrobes.group);
        }
        wardrobes = next;
        scene.add(next.group);
        updateFit();
        dirty.add('visibility');
        break;
      }
      case 'bed': {
        const next = buildBed(state);
        if (bed) {
          scene.remove(bed.group);
          disposeTree(bed.group);
        }
        bed = next;
        scene.add(next.group);
        dirty.add('visibility');
        break;
      }
      case 'bedside': {
        const next = buildBedsideTables(state);
        if (bedside) {
          scene.remove(bedside.group);
          disposeTree(bedside.group);
        }
        bedside = next;
        scene.add(next.group);
        dirty.add('visibility').add('lighting');
        break;
      }
      case 'dressing': {
        const next = buildDressingTable(state);
        if (dressing) {
          scene.remove(dressing.group);
          disposeTree(dressing.group);
        }
        dressing = next;
        scene.add(next.group);
        dirty.add('visibility');
        break;
      }
      case 'blinds': {
        if (blinds) {
          blindsHolder.remove(blinds.group);
          disposeTree(blinds.group);
        }
        blinds = buildBlinds(state);
        blindsHolder.add(blinds.group);
        resetCutaway(shell.wallGroups.window);
        blindsForce = true;
        gui.setBlindSize(blindSummary(state.blinds.type, state.blinds.mount, state.blinds.panels));
        break;
      }
      case 'curtains': {
        if (curtains) {
          curtainsHolder.remove(curtains.group);
          disposeTree(curtains.group);
        }
        curtains = buildCurtains(state);
        curtainsHolder.add(curtains.group);
        resetCutaway(shell.wallGroups.window);
        curtainsForce = true;
        gui.setCurtainSize(curtains.layout ? curtainSummary(curtains.layout, state.curtains.hardware) : '—');
        break;
      }
      case 'aircon': {
        if (aircon) {
          scene.remove(aircon.group);
          disposeTree(aircon.group);
        }
        aircon = buildAircon(state);
        aircon.update(anim.acFlap);
        scene.add(aircon.group);
        gui.setAcFit(acFit(state.aircon.gapToWindowWall, state.aircon.gapToCeiling).message);
        dirty.add('visibility');
        break;
      }
      case 'pendant': {
        const next = buildPendant(state);
        if (pendant) {
          scene.remove(pendant.group);
          disposeTree(pendant.group);
        }
        pendant = next;
        scene.add(next.group);
        dirty.add('visibility').add('lighting');
        break;
      }
      case 'visibility':
        applyVisibility();
        break;
      case 'colours':
        applyColours(state);
        break;
      case 'lighting':
        applyLighting(
          state,
          scene,
          renderer,
          lights,
          pendant,
          bedside ? { lights: bedside.lampLights, shades: bedside.lampShades, visible: state.show.lamps && state.show.bedsideTables } : null,
        );
        break;
      case 'overlays':
        overlays = swap(overlays, buildOverlays(state));
        break;
    }
  }
}

// ---- Animation ------------------------------------------------------------
const wardTarget = (i: number) => Math.max(state.doors.wardrobeAll, state.doors.wardrobe[i] ? 95 : 0);
const anim = {
  main: state.doors.mainAngle,
  pocket: state.doors.ensuiteOpen,
  ward: state.doors.wardrobe.map((_, i) => wardTarget(i)),
  lift: state.bed.ottoman ? CONFIG.bed.ottomanMaxAngle : 0,
  blindLower: state.blinds.lowered,
  blindTilt: state.blinds.tilt,
  curtainOpen: state.curtains.open,
  acFlap: state.aircon.running ? 1 : 0,
};
const approach = (cur: number, target: number, dt: number, rate = 7) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

function updateAnimations(dt: number): void {
  anim.main = approach(anim.main, state.doors.mainAngle, dt);
  doors.mainPivot.rotation.y = deg(anim.main);
  anim.pocket = approach(anim.pocket, state.doors.ensuiteOpen, dt);
  doors.pocketLeaf.position.z = mm(OPENINGS.ensuite.a0 + (anim.pocket / 100) * CONFIG.ensuiteDoor.leaf.w);
  if (wardrobes) {
    wardrobes.doorPivots.forEach((p, i) => {
      anim.ward[i] = approach(anim.ward[i], wardTarget(i), dt);
      p.rotation.y = (p.userData.hingeLeft ? 1 : -1) * deg(anim.ward[i]);
    });
  }
  if (bed) {
    anim.lift = approach(anim.lift, state.bed.ottoman ? CONFIG.bed.ottomanMaxAngle : 0, dt, 4);
    bed.liftPivot.rotation.x = -deg(anim.lift);
  }
  if (blinds) {
    const lower = approach(anim.blindLower, state.blinds.lowered, dt, 4);
    const tilt = approach(anim.blindTilt, state.blinds.tilt, dt, 6);
    if (blindsForce || Math.abs(lower - anim.blindLower) > 1e-3 || Math.abs(tilt - anim.blindTilt) > 1e-3) {
      blinds.update(lower, tilt);
      blindsForce = false;
    }
    anim.blindLower = lower;
    anim.blindTilt = tilt;
  }
  if (aircon) {
    const target = state.aircon.running ? 1 : 0;
    if (Math.abs(target - anim.acFlap) > 1e-3) {
      anim.acFlap = approach(anim.acFlap, target, dt, 2.5);
      aircon.update(anim.acFlap);
    }
  }
  if (curtains) {
    const open = approach(anim.curtainOpen, state.curtains.open, dt, 3.5);
    if (curtainsForce || Math.abs(open - anim.curtainOpen) > 1e-3) {
      curtains.update(open);
      curtainsForce = false;
    }
    anim.curtainOpen = open;
  }
}

// ---- UI -------------------------------------------------------------------
let saveTimer = 0;
const persist = () => {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => saveState(state), 300);
};

function showPreset(p: CameraPreset, animate = true): void {
  rig.setPreset(p, animate);
  setHudView(CAMERA_PRESETS[p].label);
  setHudHint('');
}

const gui = buildGui(state, {
  dirty: (...s) => s.forEach((x) => dirty.add(x)),
  preset: (p) => showPreset(p),
  walk: () => {
    rig.enterWalk();
    setHudView('Walk mode');
    setHudHint('WASD / arrow keys to move · mouse to look · Shift to hurry · Esc to exit');
  },
  eyeHeight: (v) => {
    rig.eyeHeight = mm(v);
  },
  screenshot: () => {
    processDirty();
    renderer.render(scene, rig.camera);
    renderer.domElement.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `bedroom-${state.view.preset}-${state.lighting.preset}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  },
  share: () => {
    const url = shareUrl(state);
    navigator.clipboard
      .writeText(url)
      .then(() => toast('Share link copied'))
      .catch(() => window.prompt('Copy this link', url));
  },
  reset: () => {
    clearSavedState();
    history.replaceState(null, '', location.pathname + location.search);
    mergeInto(state, defaultState());
    gui.refresh();
    BUILD_ORDER.forEach((s) => dirty.add(s));
    rig.eyeHeight = mm(state.view.eyeHeight);
    showPreset(state.view.preset);
    toast('Reset to defaults');
  },
  changed: persist,
});
rig.onWalkExit = () => {
  rig.exitWalk();
  setHudView('Orbit (from walk position)');
  setHudHint('');
};

// Number keys 1–7 jump between camera presets.
const presetKeys = Object.keys(CAMERA_PRESETS) as CameraPreset[];
window.addEventListener('keydown', (e) => {
  if (rig.mode === 'walk' || (e.target as HTMLElement).tagName === 'INPUT') return;
  const n = Number(e.key);
  if (n >= 1 && n <= presetKeys.length) {
    state.view.preset = presetKeys[n - 1];
    gui.refresh();
    showPreset(state.view.preset);
    persist();
  }
});

window.addEventListener('resize', () => {
  renderer.setSize(container.clientWidth, container.clientHeight);
  labels.setSize(container.clientWidth, container.clientHeight);
  rig.resize();
});

showPreset(state.view.preset, false);

// ?cam=x,y,z,tx,ty,tz (metres) overrides the camera, e.g. for close-up screenshots.
const camParam = new URLSearchParams(location.search).get('cam')?.split(',').map(Number);
if (camParam?.length === 6 && camParam.every(Number.isFinite)) {
  rig.persp.position.set(camParam[0], camParam[1], camParam[2]);
  rig.orbit.target.set(camParam[3], camParam[4], camParam[5]);
  rig.orbit.minDistance = 0.05;
  rig.orbit.update();
  setHudView('Custom camera');
}

// ---- Loop -----------------------------------------------------------------
const timer = new THREE.Timer();
timer.connect(document);
function frame(time?: number): void {
  timer.update(time);
  const dt = Math.min(0.05, timer.getDelta());
  processDirty();
  rig.update(dt);
  updateAnimations(dt);
  updateCutaway(rig.camera, rig.mode, state, shell.wallGroups, shell.ceiling);
  renderer.render(scene, rig.camera);
  labels.render(scene, rig.camera);
  requestAnimationFrame(frame);
}
frame();

// Handy for debugging in the console.
Object.assign(window, { bedroom: { state, scene, rig, renderer } });
