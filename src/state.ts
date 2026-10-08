import {
  CONFIG,
  type BedsideStyle,
  type BlindFinish,
  type BlindMount,
  type BlindType,
  type BuildId,
  type CurtainDrop,
  type CurtainHardware,
  type FrameSize,
  type PoleFinish,
} from './config';

export type CameraPreset = 'corner' | 'plan' | 'doorway' | 'bed' | 'ensuite' | 'wardrobes' | 'window';
export type HandleId =
  | 'bagganas-brass-335'
  | 'bagganas-black-143'
  | 'kallror-steel-405'
  | 'hamphult-oak-146'
  | 'eneryda-brass-35'
  | 'osternas-leather-65'
  | 'none';
export type LightPreset = 'day' | 'evening' | 'night';
export type PendantStyle = 'linen-drum' | 'rattan-dome' | 'opal-globe';
export type Finish = 'oak' | 'cream' | 'grey-beige' | 'walnut';
export type DressingWall = 'window' | 'door' | 'bed';

export function defaultState() {
  const build = CONFIG.wardrobes.builds[CONFIG.wardrobes.defaultBuild];
  return {
    view: {
      preset: 'corner' as CameraPreset,
      eyeHeight: 1650,
      autoCutaway: true,
      showAllWalls: false,
      showCeiling: true,
    },
    show: {
      bed: true,
      bedding: true,
      bedsideTables: true,
      lamps: false,
      dressingTable: true,
      stool: true,
      mirror: false,
      wardrobes: true,
      fillers: true,
      pendant: true,
      doors: true,
      aircon: true,
    },
    doors: {
      mainAngle: 0,
      ensuiteOpen: 0,
      wardrobeAll: 0,
      wardrobe: [false, false, false, false, false, false, false, false],
    },
    wardrobes: {
      build: CONFIG.wardrobes.defaultBuild as BuildId | 'custom',
      frame: build.frame as FrameSize,
      base: build.base,
      handle: 'bagganas-brass-335' as HandleId,
      handleHeight: 1050,
      colour: CONFIG.colours.greyBeige,
    },
    bed: {
      offset: CONFIG.bed.centreX - CONFIG.room.width / 2,
      ottoman: false,
      fabric: CONFIG.colours.bedFabric,
    },
    bedside: {
      style: 'fluted' as BedsideStyle,
      w: CONFIG.bedsideTable.w,
      d: CONFIG.bedsideTable.d,
      h: CONFIG.bedsideTable.h,
      gap: CONFIG.bedsideTable.gapToBed,
      finish: 'oak' as Finish,
    },
    dressing: {
      wall: 'window' as DressingWall,
      along: CONFIG.dressingTable.along,
      w: CONFIG.dressingTable.w,
      d: CONFIG.dressingTable.d,
    },
    blinds: {
      type: 'faux-wood' as BlindType,
      finish: 'white' as BlindFinish,
      mount: 'recess' as BlindMount,
      panels: 3,
      lowered: 100,
      tilt: 15,
    },
    aircon: {
      running: false,
      gapToWindowWall: CONFIG.aircon.gapToWindowWall,
      gapToCeiling: CONFIG.aircon.gapToCeiling,
    },
    curtains: {
      enabled: true,
      open: 100,
      drop: 'below-sill' as CurtainDrop,
      hardware: 'pole' as CurtainHardware,
      finish: 'antique-brass' as PoleFinish,
      extend: CONFIG.curtains.extendEachSide,
      above: CONFIG.curtains.aboveWindow,
      fullness: CONFIG.curtains.fullness,
      colour: CONFIG.curtains.fabric.colour,
    },
    floor: {
      axis: 'x' as 'x' | 'z',
      flip: false,
      centreline: CONFIG.floor.centreline,
      tint: '#ffffff',
      brightness: 1,
      gaps: true,
    },
    colours: {
      wall: CONFIG.colours.wall,
      trim: CONFIG.colours.trim,
      ceiling: CONFIG.colours.ceiling,
    },
    lighting: {
      preset: 'day' as LightPreset,
      sunAzimuth: -20,
      sunElevation: 28,
      pendantStyle: 'linen-drum' as PendantStyle,
      pendantDrop: CONFIG.pendant.drop,
      pendantOn: false,
      pendantIntensity: 22,
      exposure: 1,
      hqShadows: true,
    },
    overlays: {
      swings: false,
      clearances: false,
      dimensions: false,
      pocketZone: false,
      grid: false,
    },
  };
}

export type State = ReturnType<typeof defaultState>;

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Values in `cur` that differ from `def` (same shape as State, partial). */
export function diffState(def: unknown, cur: unknown): Json | undefined {
  if (isObj(def) && isObj(cur)) {
    const out: Record<string, Json> = {};
    for (const k of Object.keys(def)) {
      const d = diffState(def[k], cur[k]);
      if (d !== undefined) out[k] = d;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (Array.isArray(def) && Array.isArray(cur)) {
    return JSON.stringify(def) === JSON.stringify(cur) ? undefined : (cur as Json[]);
  }
  return def === cur ? undefined : (cur as Json);
}

/**
 * Copy values from an untrusted partial into `target`, keeping only keys that
 * already exist with the same type. Mutates in place so GUI bindings survive.
 */
export function mergeInto(target: unknown, src: unknown): void {
  if (!isObj(target) || !isObj(src)) return;
  for (const k of Object.keys(target)) {
    if (!(k in src)) continue;
    const t = target[k];
    const s = src[k];
    if (isObj(t)) mergeInto(t, s);
    else if (Array.isArray(t)) {
      if (Array.isArray(s) && s.length === t.length && s.every((v, i) => typeof v === typeof t[i])) {
        for (let i = 0; i < t.length; i++) t[i] = s[i];
      }
    } else if (typeof t === typeof s && (typeof s !== 'number' || Number.isFinite(s))) {
      target[k] = s;
    }
  }
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}

export function encodeState(state: State): string {
  return toBase64Url(JSON.stringify(diffState(defaultState(), state) ?? {}));
}

/** Parse an encoded share string. Returns null for anything malformed. */
export function decodeState(encoded: string): unknown {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(encoded));
    return isObj(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Build a State from defaults, overlaid by an encoded partial (if valid). */
export function stateFromEncoded(encoded: string | null | undefined): State {
  const s = defaultState();
  if (encoded) mergeInto(s, decodeState(encoded));
  return s;
}

const STORAGE_KEY = 'bedroom-remodel:v1';
const HASH_PREFIX = '#s=';

export function loadInitialState(): State {
  const s = defaultState();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) mergeInto(s, JSON.parse(saved));
  } catch {
    /* storage unavailable or corrupt: defaults */
  }
  try {
    if (location.hash.startsWith(HASH_PREFIX)) mergeInto(s, decodeState(location.hash.slice(HASH_PREFIX.length)));
  } catch {
    /* ignore */
  }
  return s;
}

export function saveState(state: State): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diffState(defaultState(), state) ?? {}));
  } catch {
    /* ignore */
  }
}

export function clearSavedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function shareUrl(state: State): string {
  const url = new URL(location.href);
  url.hash = HASH_PREFIX.slice(1) + encodeState(state);
  return url.toString();
}
