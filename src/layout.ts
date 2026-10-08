// Pure layout maths shared by the builders and the overlays (all mm, room coordinates).
import { CONFIG } from './config';
import type { State } from './state';

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export function bedRect(s: State): Rect {
  const cx = CONFIG.room.width / 2 + s.bed.offset;
  const z0 = CONFIG.furnitureWallGap;
  return { x0: cx - CONFIG.bed.width / 2, x1: cx + CONFIG.bed.width / 2, z0, z1: z0 + CONFIG.bed.length };
}

export function bedsideRects(s: State): [Rect, Rect] {
  const b = bedRect(s);
  const z0 = CONFIG.furnitureWallGap;
  const z1 = z0 + s.bedside.d;
  return [
    { x0: b.x0 - s.bedside.gap - s.bedside.w, x1: b.x0 - s.bedside.gap, z0, z1 },
    { x0: b.x1 + s.bedside.gap, x1: b.x1 + s.bedside.gap + s.bedside.w, z0, z1 },
  ];
}

export function dressingRect(s: State): Rect {
  const { along, w, d, wall } = s.dressing;
  const g = CONFIG.furnitureWallGap;
  const R = CONFIG.room;
  if (wall === 'window') return { x0: R.width - g - d, x1: R.width - g, z0: along - w / 2, z1: along + w / 2 };
  if (wall === 'door') return { x0: g, x1: g + d, z0: along - w / 2, z1: along + w / 2 };
  return { x0: along - w / 2, x1: along + w / 2, z0: g, z1: g + d };
}

export interface WardrobeDims {
  base: number;
  frameH: number;
  doorH: number;
  panels: number;
  doorTop: number;
  doorBottom: number;
  topFiller: number;
  doorFaceZ: number;
  frameFrontZ: number;
  frameArticle: string;
  doorArticle: string;
}

export function wardrobeDims(s: State): WardrobeDims {
  const W = CONFIG.wardrobes;
  const spec = W.frames[s.wardrobes.frame];
  const base = s.wardrobes.base;
  const doorTop = base + spec.frameH - W.doorTopBelowFrameTop;
  const frameFrontZ = CONFIG.room.depth - W.frameDepth;
  return {
    base,
    frameH: spec.frameH,
    doorH: spec.doorH,
    panels: spec.panels,
    doorTop,
    doorBottom: doorTop - spec.doorH,
    topFiller: CONFIG.room.ceiling - doorTop,
    doorFaceZ: frameFrontZ - W.door.gapToFrame - W.door.t,
    frameFrontZ,
    frameArticle: spec.frameArticle,
    doorArticle: spec.doorArticle,
  };
}

/** Wardrobe door i (0–7): x range, hinge x and hinge side. Left door of each frame hinges left. */
export function wardrobeDoor(i: number): { x0: number; x1: number; hingeX: number; hingeLeft: boolean } {
  const W = CONFIG.wardrobes;
  const frameX = W.run.xStart + Math.floor(i / 2) * W.run.unitWidth;
  const hingeLeft = i % 2 === 0;
  const x0 = hingeLeft ? frameX + W.door.sideGap : frameX + W.run.unitWidth / 2 + W.door.sideGap;
  const x1 = x0 + W.door.w;
  return { x0, x1, hingeX: hingeLeft ? x0 : x1, hingeLeft };
}

/** Gap between two axis-aligned rects (negative = overlap depth), plus the nearest points. */
export function rectGap(a: Rect, b: Rect): { gap: number; p: [number, number]; q: [number, number] } {
  const dx = Math.max(b.x0 - a.x1, a.x0 - b.x1);
  const dz = Math.max(b.z0 - a.z1, a.z0 - b.z1);
  const mid = (lo: number, hi: number) => (lo + hi) / 2;
  // Overlapping range on each axis (used for the measuring line position).
  const ox = mid(Math.max(a.x0, b.x0), Math.min(a.x1, b.x1));
  const oz = mid(Math.max(a.z0, b.z0), Math.min(a.z1, b.z1));
  if (dx > 0 && dz > 0) {
    const px = b.x0 > a.x1 ? a.x1 : a.x0;
    const qx = b.x0 > a.x1 ? b.x0 : b.x1;
    const pz = b.z0 > a.z1 ? a.z1 : a.z0;
    const qz = b.z0 > a.z1 ? b.z0 : b.z1;
    return { gap: Math.hypot(dx, dz), p: [px, pz], q: [qx, qz] };
  }
  if (dx >= dz) {
    const [p, q] = b.x0 > a.x1 ? [a.x1, b.x0] : [a.x0, b.x1];
    return { gap: dx, p: [p, oz], q: [q, oz] };
  }
  const [p, q] = b.z0 > a.z1 ? [a.z1, b.z0] : [a.z0, b.z1];
  return { gap: dz, p: [ox, p], q: [ox, q] };
}
