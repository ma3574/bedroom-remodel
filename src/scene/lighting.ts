// Sun through the window, sky fill, environment reflections and day/evening/night presets.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG } from '../config';
import { setSky } from '../materials/library';
import type { LightPreset, State } from '../state';
import { deg, mm } from '../units';

export interface Lights {
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  fill: THREE.AmbientLight;
}

const target = new THREE.Vector3(mm(CONFIG.room.width / 2), 0, mm(CONFIG.room.depth / 2));

export function createLights(scene: THREE.Scene, renderer: THREE.WebGLRenderer): Lights {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const hemi = new THREE.HemisphereLight('#DFE9F5', '#B9A58C', 1);
  const fill = new THREE.AmbientLight('#ffffff', 0);
  const sun = new THREE.DirectionalLight('#FFF4E0', 3.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const cam = sun.shadow.camera;
  cam.left = -4.5;
  cam.right = 4.5;
  cam.top = 4.5;
  cam.bottom = -4.5;
  cam.near = 0.5;
  cam.far = 25;
  cam.layers.enable(1); // hidden (cut-away) walls still cast shadows
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.target.position.copy(target);
  scene.add(hemi, fill, sun, sun.target);
  return { hemi, sun, fill };
}

interface PresetSpec {
  sun: number;
  sunColour: string;
  hemi: number;
  sky: string;
  ground: string;
  env: number;
  background: string;
}

export const PRESETS: Record<LightPreset, PresetSpec> = {
  day: { sun: 3.5, sunColour: '#FFF4E0', hemi: 1.1, sky: '#DFE9F5', ground: '#B9A58C', env: 0.35, background: '#C9D6E2' },
  evening: { sun: 2.2, sunColour: '#FFB070', hemi: 0.45, sky: '#9AA6C8', ground: '#8C7562', env: 0.18, background: '#7E7A8C' },
  night: { sun: 0, sunColour: '#000000', hemi: 0.06, sky: '#1A2030', ground: '#15120E', env: 0.04, background: '#0B0E16' },
};

/** Sun elevation/azimuth defaults applied when switching presets. */
export const PRESET_SUN: Record<LightPreset, { azimuth: number; elevation: number }> = {
  day: { azimuth: -20, elevation: 28 },
  evening: { azimuth: -55, elevation: 9 },
  night: { azimuth: -20, elevation: 28 },
};

export function applyLighting(
  s: State,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  L: Lights,
  pendant: { light: THREE.PointLight; glow: THREE.MeshStandardMaterial[] } | null,
  lamps: { lights: THREE.PointLight[]; shades: THREE.Mesh[]; visible: boolean } | null,
): void {
  const p = PRESETS[s.lighting.preset];
  renderer.toneMappingExposure = s.lighting.exposure;
  L.hemi.intensity = p.hemi;
  L.hemi.color.set(p.sky);
  L.hemi.groundColor.set(p.ground);
  scene.environmentIntensity = p.env;
  scene.background = new THREE.Color(p.background);
  setSky(s.lighting.preset);

  L.sun.intensity = p.sun;
  L.sun.visible = p.sun > 0;
  L.sun.color.set(p.sunColour);
  const az = deg(s.lighting.sunAzimuth);
  const el = deg(s.lighting.sunElevation);
  const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
  L.sun.position.copy(target).addScaledVector(dir, 10);

  const lampsOn = s.lighting.preset !== 'day';
  if (pendant) {
    const on = s.lighting.pendantOn && s.show.pendant;
    pendant.light.intensity = on ? s.lighting.pendantIntensity : 0;
    pendant.light.visible = on;
    pendant.light.castShadow = on && s.lighting.hqShadows;
    for (const m of pendant.glow) m.emissiveIntensity = on ? 0.55 : 0;
  }
  if (lamps) {
    const on = lampsOn && lamps.visible;
    for (const l of lamps.lights) {
      l.intensity = on ? 6 : 0;
      l.visible = on;
    }
    for (const sh of lamps.shades) (sh.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 0.8 : 0;
  }
}
