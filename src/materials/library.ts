// Shared materials. Builders reference these (never dispose them); colour changes update them in place.
import * as THREE from 'three';
import { CONFIG } from '../config';
import type { Finish, State } from '../state';
import pesaroUrl from '../assets/pesaro-oak.png';
import {
  carpetCanvas,
  dataTexture,
  highPassBumpCanvas,
  melangeCanvas,
  skyCanvas,
  srgbTexture,
  tileCanvas,
  weaveCanvases,
  woodGrainCanvas,
  type SkyKind,
} from './textures';

const C = CONFIG.colours;
const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

export const M = {
  wall: std({ color: C.wall, roughness: 0.95 }),
  trim: std({ color: C.trim, roughness: 0.6 }),
  ceiling: std({ color: C.ceiling, roughness: 0.95 }),
  subfloor: std({ color: C.floorGap, roughness: 0.9 }),
  greyBeige: std({ color: C.greyBeige, roughness: 0.55 }),
  kick: std({ color: new THREE.Color(C.greyBeige).multiplyScalar(0.88), roughness: 0.6 }),
  carcass: std({ color: new THREE.Color(C.greyBeige).multiplyScalar(0.97), roughness: 0.7 }),
  pesaroFace: std({ color: '#ffffff', roughness: 0.55 }),
  oakEdge: std({ color: C.oak, roughness: 0.6 }),
  oak: std({ color: '#ffffff', roughness: 0.6 }),
  walnut: std({ color: C.bedLegs, roughness: 0.55 }),
  walnutGrain: std({ color: '#ffffff', roughness: 0.55 }),
  fabric: std({ color: C.bedFabric, roughness: 0.92 }),
  mattress: std({ color: '#F1EEE8', roughness: 0.9 }),
  duvet: std({ color: '#F4F1EB', roughness: 0.92 }),
  pillow: std({ color: '#EDE7DD', roughness: 0.92 }),
  cushion: std({ color: '#B9A792', roughness: 0.92 }),
  storage: std({ color: '#3A3836', roughness: 0.9 }),
  brass: std({ color: '#C9A55C', metalness: 1, roughness: 0.3 }),
  black: std({ color: '#1C1C1C', metalness: 0.5, roughness: 0.45 }),
  steel: std({ color: '#C3C6C9', metalness: 1, roughness: 0.32 }),
  chrome: std({ color: '#D8DADC', metalness: 1, roughness: 0.22 }),
  darkChrome: std({ color: '#6E7174', metalness: 1, roughness: 0.3 }),
  leather: std({ color: '#8B5A2B', roughness: 0.7 }),
  handleOak: std({ color: '#B98D5E', roughness: 0.55 }),
  upvc: std({ color: C.windowFrame, roughness: 0.4 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: '#DCE8EE',
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  }),
  carpet: std({ color: '#ffffff', roughness: 1 }),
  tile: std({ color: '#ffffff', roughness: 0.4 }),
  stubWall: std({ color: C.stubWall, roughness: 0.95, side: THREE.BackSide }),
  threshold: std({ color: '#B08A5E', roughness: 0.5 }),
  ceramic: std({ color: '#D8CFC2', roughness: 0.35 }),
  linen: std({ color: '#EDE6DA', roughness: 0.95, side: THREE.DoubleSide, emissive: '#FFD9A8', emissiveIntensity: 0 }),
  opal: std({ color: '#F6F2EA', roughness: 0.3, emissive: '#FFE2BC', emissiveIntensity: 0 }),
  rattan: std({ color: '#ffffff', roughness: 0.85, side: THREE.DoubleSide, alphaTest: 0.5 }),
  diffuser: std({ color: '#FFF8EE', roughness: 0.6, emissive: '#FFE2BC', emissiveIntensity: 0, side: THREE.DoubleSide }),
  flex: std({ color: '#F2F0EC', roughness: 0.5 }),
  mirror: std({ color: '#ffffff', metalness: 1, roughness: 0.04 }),
  stoolFabric: std({ color: '#CDBFAE', roughness: 0.95 }),
  backdrop: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
};

/** One material per floor texture variant (built in initTextures). */
export const floorMaterials: THREE.MeshStandardMaterial[] = [];

const skyTextures: Partial<Record<SkyKind, THREE.Texture>> = {};

export function initTextures(renderer: THREE.WebGLRenderer, onReady: () => void): void {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const F = CONFIG.floor;
  for (let v = 0; v < F.textureVariants; v++) {
    const tex = srgbTexture(
      woodGrainCanvas({ base: C.floorBase, dark: C.floorGrainDark, light: C.floorGrainLight, seed: 1000 + v * 7 }),
    );
    tex.anisotropy = aniso;
    floorMaterials.push(std({ map: tex, roughness: 0.62, color: '#ffffff' }));
  }

  const oakTex = srgbTexture(woodGrainCanvas({ base: '#C49A6C', dark: '#94693F', light: '#DDBB8E', seed: 51, w: 512, h: 512, streaks: 160 }));
  oakTex.anisotropy = aniso;
  M.oak.map = oakTex;
  const walnutTex = srgbTexture(woodGrainCanvas({ base: '#6A4630', dark: '#3E2617', light: '#87604A', seed: 77, w: 512, h: 512, streaks: 160 }));
  M.walnutGrain.map = walnutTex;

  const fab = melangeCanvas('#ffffff', 11);
  for (const m of [M.fabric, M.stoolFabric]) {
    m.map = srgbTexture(fab, [6, 6]);
    m.bumpMap = dataTexture(fab, [6, 6]);
    m.bumpScale = 0.6;
  }
  for (const m of [M.duvet, M.pillow, M.cushion, M.mattress]) {
    m.bumpMap = dataTexture(melangeCanvas('#ffffff', 23), [8, 8]);
    m.bumpScale = 0.4;
  }

  const weave = weaveCanvases();
  M.rattan.map = srgbTexture(weave.color, [6, 3]);
  M.rattan.alphaMap = dataTexture(weave.alpha, [6, 3]);
  M.tile.map = srgbTexture(tileCanvas(), [1, 1]);
  M.carpet.map = srgbTexture(carpetCanvas(), [4, 4]);

  for (const kind of ['day', 'evening', 'night'] as SkyKind[]) {
    const t = srgbTexture(skyCanvas(kind));
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    skyTextures[kind] = t;
  }
  M.backdrop.map = skyTextures.day!;

  new THREE.TextureLoader().load(pesaroUrl, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    M.pesaroFace.map = tex;
    const bump = dataTexture(highPassBumpCanvas(tex.image as HTMLImageElement));
    bump.wrapS = bump.wrapT = THREE.ClampToEdgeWrapping;
    M.pesaroFace.bumpMap = bump;
    M.pesaroFace.bumpScale = 2.5;
    M.pesaroFace.needsUpdate = true;
    onReady();
  });

  for (const m of Object.values(M)) m.needsUpdate = true;
}

export function setSky(kind: SkyKind): void {
  const t = skyTextures[kind];
  if (t && M.backdrop.map !== t) {
    M.backdrop.map = t;
    M.backdrop.needsUpdate = true;
  }
}

export function finishMaterial(f: Finish): THREE.MeshStandardMaterial {
  switch (f) {
    case 'oak':
      return M.oak;
    case 'cream':
      return M.fabric;
    case 'grey-beige':
      return M.greyBeige;
    case 'walnut':
      return M.walnutGrain;
  }
}

/** Push colour choices from state into the shared materials. */
export function applyColours(s: State): void {
  M.wall.color.set(s.colours.wall);
  M.trim.color.set(s.colours.trim);
  M.ceiling.color.set(s.colours.ceiling);
  M.greyBeige.color.set(s.wardrobes.colour);
  M.kick.color.set(s.wardrobes.colour).multiplyScalar(0.88);
  M.carcass.color.set(s.wardrobes.colour).multiplyScalar(0.97);
  M.fabric.color.set(s.bed.fabric);
  const tint = new THREE.Color(s.floor.tint).multiplyScalar(s.floor.brightness);
  for (const m of floorMaterials) m.color.copy(tint);
}
