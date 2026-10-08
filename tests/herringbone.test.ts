import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { generateHerringbone, plankContains, type HerringboneParams } from '../src/lib/herringbone';
import { mulberry32 } from '../src/lib/rng';

const base: HerringboneParams = {
  roomW: CONFIG.room.width,
  roomD: CONFIG.room.depth,
  plankW: CONFIG.floor.plank.w,
  plankL: CONFIG.floor.plank.l,
  axis: 'x',
  flip: false,
  centreline: CONFIG.floor.centreline,
  seed: CONFIG.floor.seed,
  variants: 8,
  jitter: [0.88, 1.1],
};

function coverage(p: HerringboneParams, samples = 5000) {
  const planks = generateHerringbone(p);
  const rng = mulberry32(42);
  let bad = 0;
  for (let i = 0; i < samples; i++) {
    const x = rng() * p.roomW;
    const z = rng() * p.roomD;
    const hits = planks.filter((pl) => plankContains(pl, x, z, p.plankW, p.plankL)).length;
    if (hits !== 1) bad++;
  }
  return { planks, bad };
}

describe('herringbone', () => {
  it('covers the room with no gaps or overlaps (default axis)', () => {
    const { planks, bad } = coverage(base);
    expect(bad).toBe(0);
    expect(planks.length).toBeGreaterThan(450);
    expect(planks.length).toBeLessThan(700);
  });

  it('covers the room when turned 90° and flipped', () => {
    expect(coverage({ ...base, axis: 'z' }).bad).toBe(0);
    expect(coverage({ ...base, flip: true, centreline: 1000 }).bad).toBe(0);
  });

  it('is deterministic for the same seed', () => {
    expect(generateHerringbone(base)).toEqual(generateHerringbone(base));
  });

  it('turning the axis rotates plank angles by 90°', () => {
    const a = generateHerringbone(base)[0];
    const b = generateHerringbone({ ...base, axis: 'z', centreline: base.centreline })[0];
    const norm = (v: number) => ((v % Math.PI) + Math.PI) % Math.PI;
    const angles = (p: typeof a) => [norm(p.angle), norm(p.angle + Math.PI / 2)].sort();
    // Both patterns only contain planks at ±45° relative to their axis.
    expect(angles(a).map((v) => +v.toFixed(6))).toEqual(angles(b).map((v) => +v.toFixed(6)));
  });
});
