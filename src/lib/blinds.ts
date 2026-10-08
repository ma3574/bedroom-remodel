// Pure layout maths for venetian blinds (wall coordinates on the window wall, mm).
import { CONFIG, OPENINGS, type BlindMount, type BlindSpec, type BlindType } from '../config';

export interface BlindPanel {
  a0: number;
  a1: number;
  /** Top of the headrail. */
  top: number;
  /** Bottom of the bottom rail when fully lowered. */
  bottom: number;
  /** Wall c-coordinate of the slat centreline (positive = into the reveal, negative = into the room). */
  slatC: number;
}

export function blindPanels(spec: BlindSpec, mount: BlindMount, count: number): BlindPanel[] {
  const B = CONFIG.blinds;
  const W = OPENINGS.window;
  const n = Math.max(1, Math.min(3, Math.round(count)));
  const recess = mount === 'recess';
  const a0 = recess ? W.a0 + B.recess.sideClearance : W.a0 - B.face.overlap;
  const a1 = recess ? W.a1 - B.recess.sideClearance : W.a1 + B.face.overlap;
  const top = recess ? W.b1 - B.recess.topGap : W.b1 + B.face.above;
  const slatC = recess ? B.recess.frontInset + spec.slat / 2 : -(B.face.standoff + spec.slat / 2);
  const bottom = W.b0 + B.sillGap;
  const each = (a1 - a0 - (n - 1) * B.panelGap) / n;
  return Array.from({ length: n }, (_, i) => {
    const s = a0 + i * (each + B.panelGap);
    return { a0: s, a1: s + each, top, bottom, slatC };
  });
}

export interface SlatPose {
  y: number;
  stacked: boolean;
}

/**
 * Slat heights for a blind lowered by `lowered` (0 = fully raised, 1 = fully down).
 * Raising lifts the bottom rail, which collects slats into a stack from the bottom up;
 * stacked slats lie flat.
 */
export function slatLayout(
  spec: BlindSpec,
  top: number,
  bottom: number,
  lowered: number,
): { slats: SlatPose[]; railTop: number; zoneTop: number } {
  const zoneTop = top - spec.headrail.h;
  const zoneBottom = bottom + spec.bottomRail;
  const n = Math.max(0, Math.floor((zoneTop - zoneBottom) / spec.pitch));
  const L = Math.min(1, Math.max(0, lowered));
  const raisedRailTop = zoneTop - n * spec.stackPitch;
  const railTop = zoneBottom + (1 - L) * (raisedRailTop - zoneBottom);
  const slats: SlatPose[] = [];
  for (let i = 0; i < n; i++) {
    const natural = zoneTop - spec.pitch * (i + 0.5);
    const stacked = railTop + spec.stackPitch * (n - i - 0.5);
    slats.push(natural >= stacked ? { y: natural, stacked: false } : { y: stacked, stacked: true });
  }
  return { slats, railTop, zoneTop };
}

/** Ordering summary, e.g. "3 × 783 × 1233 mm (W × drop)". */
export function blindSummary(type: BlindType, mount: BlindMount, count: number): string {
  if (type === 'none') return '—';
  const spec = CONFIG.blinds.types[type];
  const panels = blindPanels(spec, mount, count);
  const w = Math.round(panels[0].a1 - panels[0].a0);
  const drop = Math.round(panels[0].top - panels[0].bottom);
  const warn = w > spec.typicalMaxWidth ? ` ⚠ wider than typical max ${spec.typicalMaxWidth}` : '';
  return `${panels.length} × ${w} × ${drop} mm (W × drop)${warn}`;
}
