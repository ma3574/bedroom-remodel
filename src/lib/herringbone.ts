import { mulberry32 } from './rng';

export interface HerringboneParams {
  roomW: number; // mm, along x
  roomD: number; // mm, along z
  plankW: number;
  plankL: number;
  /** 'x' = arrows run parallel to the wardrobe wall; 'z' = turned 90°. */
  axis: 'x' | 'z';
  flip: boolean;
  /** Perpendicular position (mm) of the main spine. */
  centreline: number;
  seed: number;
  variants: number;
  jitter: [number, number];
}

export interface Plank {
  cx: number; // mm
  cz: number; // mm
  /** Direction of the plank's long axis, radians, measured from +x towards +z. */
  angle: number;
  isH: boolean;
  variant: number;
  tone: number;
  warmth: number;
}

/**
 * Classic 90° herringbone. In an axis-aligned pattern space (S,T) the lattice
 * vectors are (W, W) along the arrow axis and (L, −L) across rows, which tiles
 * for any length/width ratio:
 *   H(k,j) = [kW + jL, kW + jL + L] × [kW − jL, kW − jL + W]
 *   V(k,j) = [kW − W + jL, kW + jL] × [kW − jL, kW − jL + L]
 * The pattern is then rotated so (1,1) maps onto the requested axis and shifted
 * so the spine S = T lands on the centreline.
 */
export function generateHerringbone(p: HerringboneParams): Plank[] {
  const W = p.plankW;
  const L = p.plankL;
  const alpha = (p.axis === 'x' ? 0 : Math.PI / 2) + (p.flip ? Math.PI : 0);
  const theta = alpha - Math.PI / 4;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const ox = p.axis === 'x' ? 0 : p.centreline;
  const oz = p.axis === 'x' ? p.centreline : 0;

  const fwd = (S: number, T: number) => ({ x: S * c - T * s + ox, z: S * s + T * c + oz });
  const inv = (x: number, z: number) => {
    const dx = x - ox;
    const dz = z - oz;
    return { S: dx * c + dz * s, T: -dx * s + dz * c };
  };

  const corners = [inv(0, 0), inv(p.roomW, 0), inv(0, p.roomD), inv(p.roomW, p.roomD)];
  const sums = corners.map((q) => q.S + q.T);
  const diffs = corners.map((q) => q.S - q.T);
  const kMargin = Math.ceil(L / W) + 2;
  const kMin = Math.floor(Math.min(...sums) / (2 * W)) - kMargin;
  const kMax = Math.ceil(Math.max(...sums) / (2 * W)) + kMargin;
  const jMin = Math.floor(Math.min(...diffs) / (2 * L)) - 2;
  const jMax = Math.ceil(Math.max(...diffs) / (2 * L)) + 2;

  const rng = mulberry32(p.seed);
  const out: Plank[] = [];
  const push = (S: number, T: number, isH: boolean) => {
    const { x, z } = fwd(S, T);
    const angle = isH ? theta : theta + Math.PI / 2;
    // Draw random numbers for every candidate so results don't depend on clipping.
    const variant = Math.floor(rng() * p.variants);
    const tone = p.jitter[0] + rng() * (p.jitter[1] - p.jitter[0]);
    const warmth = (rng() - 0.5) * 0.06;
    if (!rectOverlapsRoom(x, z, angle, L / 2, W / 2, p.roomW, p.roomD)) return;
    out.push({ cx: x, cz: z, angle, isH, variant, tone, warmth });
  };

  for (let j = jMin; j <= jMax; j++) {
    for (let k = kMin; k <= kMax; k++) {
      const s0 = k * W + j * L;
      const t0 = k * W - j * L;
      push(s0 + L / 2, t0 + W / 2, true);
      push(s0 - W / 2, t0 + L / 2, false);
    }
  }
  return out;
}

/** Separating-axis test: rotated rectangle vs the room rectangle [0,rw]×[0,rd]. */
export function rectOverlapsRoom(
  cx: number,
  cz: number,
  angle: number,
  hl: number,
  hw: number,
  rw: number,
  rd: number,
): boolean {
  const eps = 1e-6;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const ex = hl * Math.abs(ca) + hw * Math.abs(sa);
  const ez = hl * Math.abs(sa) + hw * Math.abs(ca);
  if (cx + ex <= eps || cx - ex >= rw - eps) return false;
  if (cz + ez <= eps || cz - ez >= rd - eps) return false;
  const corners: [number, number][] = [
    [0, 0],
    [rw, 0],
    [0, rd],
    [rw, rd],
  ];
  for (const [ax, az, h] of [
    [ca, sa, hl],
    [-sa, ca, hw],
  ] as const) {
    const centre = cx * ax + cz * az;
    const proj = corners.map(([x, z]) => x * ax + z * az);
    if (Math.max(...proj) <= centre - h + eps || Math.min(...proj) >= centre + h - eps) return false;
  }
  return true;
}

/** True if room point (x,z) lies strictly inside the plank. */
export function plankContains(pl: Plank, x: number, z: number, W: number, L: number): boolean {
  const dx = x - pl.cx;
  const dz = z - pl.cz;
  const along = dx * Math.cos(pl.angle) + dz * Math.sin(pl.angle);
  const across = -dx * Math.sin(pl.angle) + dz * Math.cos(pl.angle);
  return Math.abs(along) < L / 2 && Math.abs(across) < W / 2;
}
