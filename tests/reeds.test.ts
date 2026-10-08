import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { reededRoundedRect, reededStrip } from '../src/lib/reeds';
import { bedsideRects } from '../src/layout';
import { defaultState } from '../src/state';

const area = (pts: [number, number][]) => pts.reduce((a, [x, y], i) => {
  const [nx, ny] = pts[(i + 1) % pts.length];
  return a + (x * ny - nx * y) / 2;
}, 0);

describe('reeded outlines', () => {
  const o = { x0: 10, x1: 440, y0: 0, y1: 404, r: 80, pitch: 21, depth: 6, step: 2.6 };

  it('stays within the reed depth of the base rectangle and winds counter-clockwise', () => {
    const pts = reededRoundedRect(o);
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(o.x0 - o.depth - 1e-6);
      expect(x).toBeLessThanOrEqual(o.x1 + o.depth + 1e-6);
      expect(y).toBeGreaterThanOrEqual(o.y0 - o.depth - 1e-6);
      expect(y).toBeLessThanOrEqual(o.y1 + o.depth + 1e-6);
    }
    expect(area(pts)).toBeGreaterThan(0);
  });

  it('recesses the straight front for drawers', () => {
    const pts = reededRoundedRect({ ...o, frontRecess: 18 });
    const front = pts.filter(([x]) => x > o.x0 + o.r + 1 && x < o.x1 - o.r - 1).map(([, y]) => y);
    expect(Math.max(...front)).toBeCloseTo(o.y1 - 18);
  });

  it('drawer strip reeds start and end flush and fit a whole number of reeds', () => {
    const pts = reededStrip(90, 360, 380, 398, 21, 6, 2.6);
    expect(pts[2][1]).toBeCloseTo(398);
    expect(pts[pts.length - 1][1]).toBeCloseTo(398);
    expect(area(pts)).toBeGreaterThan(0);
  });
});

describe('bedside styles', () => {
  it('reeded style defaults place wider tables beside the bed', () => {
    const s = defaultState();
    const st = CONFIG.bedsideStyles['reeded-oak'];
    Object.assign(s.bedside, { style: 'reeded-oak', w: st.w, d: st.d, h: st.h });
    const [l, r] = bedsideRects(s);
    expect(l.x1 - l.x0).toBe(450);
    expect(r.z1 - r.z0).toBe(420);
    // Still clears the fully open main door (leaf 762mm).
    expect(l.x0).toBeGreaterThan(CONFIG.mainDoor.leaf.w);
  });
});
