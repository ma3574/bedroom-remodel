// Plan outlines (x across, y = depth towards the front) with reeded (half-round) edges, mm.

export type Pt = [number, number];

export interface ReededRectOptions {
  x0: number;
  x1: number;
  y0: number; // back
  y1: number; // front
  r: number; // corner radius
  pitch: number;
  depth: number; // reed bulge (0 = plain rounded rectangle)
  step: number;
  /** Set the straight front back by this much (no reeds) so drawer fronts can sit in it. */
  frontRecess?: number;
}

/** Counter-clockwise outline of a rounded rectangle whose edge is reeded all round. */
export function reededRoundedRect(o: ReededRectOptions): Pt[] {
  const { x0, x1, y0, y1, r, pitch, depth, step } = o;
  const pts: Pt[] = [];
  let s = 0; // running arc length, so reeds flow round the corners
  const bump = () => depth * Math.abs(Math.sin((Math.PI * s) / pitch));
  const line = (ax: number, ay: number, bx: number, by: number, nx: number, ny: number, recess?: number) => {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.ceil(len / step));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const off = recess !== undefined ? -recess : bump();
      pts.push([ax + (bx - ax) * t + nx * off, ay + (by - ay) * t + ny * off]);
      s += len / n;
    }
    if (recess !== undefined) pts.push([bx - nx * recess, by - ny * recess]);
  };
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    const len = Math.abs(a1 - a0) * r;
    const n = Math.max(2, Math.ceil(len / step));
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      const off = r + bump();
      pts.push([cx + Math.cos(a) * off, cy + Math.sin(a) * off]);
      s += len / n;
    }
  };
  const H = Math.PI / 2;
  line(x0 + r, y0, x1 - r, y0, 0, -1);
  arc(x1 - r, y0 + r, -H, 0);
  line(x1, y0 + r, x1, y1 - r, 1, 0);
  arc(x1 - r, y1 - r, 0, H);
  if (o.frontRecess !== undefined) line(x1 - r, y1, x0 + r, y1, 0, 1, o.frontRecess);
  else line(x1 - r, y1, x0 + r, y1, 0, 1);
  arc(x0 + r, y1 - r, H, 2 * H);
  line(x0, y1 - r, x0, y0 + r, -1, 0);
  arc(x0 + r, y0 + r, 2 * H, 3 * H);
  return pts;
}

/** Counter-clockwise outline of a straight strip whose front edge is reeded (for drawer fronts). */
export function reededStrip(x0: number, x1: number, yBack: number, yFront: number, targetPitch: number, depth: number, step: number): Pt[] {
  const w = x1 - x0;
  const pitch = w / Math.max(1, Math.round(w / targetPitch));
  const n = Math.max(2, Math.ceil(w / step));
  const pts: Pt[] = [
    [x0, yBack],
    [x1, yBack],
  ];
  for (let i = n; i >= 0; i--) {
    const x = x0 + (w * i) / n;
    pts.push([x, yFront + depth * Math.abs(Math.sin((Math.PI * (x - x0)) / pitch))]);
  }
  return pts;
}
