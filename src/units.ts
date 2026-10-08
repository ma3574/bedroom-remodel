/** Millimetres → scene metres. */
export const mm = (v: number): number => v / 1000;

/** Degrees → radians. */
export const deg = (d: number): number => (d * Math.PI) / 180;

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
