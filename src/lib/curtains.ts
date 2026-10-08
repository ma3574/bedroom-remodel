// Pure layout maths for the curtain pair (window-wall coordinates, mm).
import { CONFIG, OPENINGS, type CurtainDrop, type CurtainHardware } from '../config';
import type { State } from '../state';

export interface CurtainSettings {
  drop: CurtainDrop;
  hardware: CurtainHardware;
  extend: number;
  above: number;
  fullness: number;
  faceBlinds: boolean;
}

export interface CurtainLayout {
  /** Pole/track span (excluding finials) along the wall. */
  a0: number;
  a1: number;
  /** Pole centre / track bottom height. */
  hardwareY: number;
  /** Heading top and hem. */
  top: number;
  bottom: number;
  /** Fabric centreline, wall c (negative = into the room). */
  c: number;
  closedSpan: number; // each curtain, closed
  flatWidth: number; // each curtain, flat fabric
  stackSpan: number; // each curtain, fully open
  folds: number;
}

export function curtainLayout(s: CurtainSettings): CurtainLayout {
  const C = CONFIG.curtains;
  const W = OPENINGS.window;
  const a0 = W.a0 - s.extend;
  const a1 = W.a1 + s.extend;
  const maxY = CONFIG.room.ceiling - C.pole.finial / 2 - 5;
  const hardwareY = Math.min(W.b1 + s.above, maxY);
  // Pole: heading sits just under the rings. Track: heading covers the track.
  const top = s.hardware === 'pole' ? hardwareY - (C.pole.ringRadius - C.pole.diameter / 2) - C.pole.ringRadius - 6 : hardwareY + C.track.h + 8;
  const bottom = C.drops[s.drop];
  const closedSpan = (a1 - a0) / 2;
  const flatWidth = closedSpan * s.fullness;
  const stackSpan = Math.max(140, flatWidth * C.stackRatio);
  const folds = Math.max(4, Math.round(closedSpan / C.foldPitch));
  return {
    a0,
    a1,
    hardwareY,
    top,
    bottom,
    c: -(s.faceBlinds ? C.projectionWithFaceBlinds : C.projection),
    closedSpan,
    flatWidth,
    stackSpan,
    folds,
  };
}

export function curtainSettingsFrom(s: State): CurtainSettings {
  return {
    drop: s.curtains.drop,
    hardware: s.curtains.hardware,
    extend: s.curtains.extend,
    above: s.curtains.above,
    fullness: s.curtains.fullness,
    faceBlinds: s.blinds.type !== 'none' && s.blinds.mount === 'face',
  };
}

/** Covered span of one curtain for open = 0 (closed) … 100 (fully open). */
export function curtainSpan(L: CurtainLayout, open: number): number {
  const t = Math.min(1, Math.max(0, open / 100));
  return L.closedSpan + (L.stackSpan - L.closedSpan) * t;
}

/**
 * Peak depth of the folds when `flatWidth` of fabric is gathered into `span`
 * (zig-zag approximation: each half-fold is a segment of length flat/2N).
 */
export function foldAmplitude(flatWidth: number, span: number, folds: number): number {
  const l = flatWidth / (2 * folds);
  const h = span / (2 * folds);
  return Math.sqrt(Math.max(0, l * l - h * h)) / 2;
}

/** Ordering summary in the retailer's terms (pole/track width × drop). */
export function curtainSummary(L: CurtainLayout, hardware: CurtainHardware): string {
  const widths = (L.flatWidth / CONFIG.curtains.fabric.boltWidth).toFixed(1);
  return `${hardware === 'pole' ? 'Pole' : 'Track'} ${Math.round(L.a1 - L.a0)} × drop ${Math.round(L.top - L.bottom)} mm · ≈${widths} fabric widths per curtain`;
}
