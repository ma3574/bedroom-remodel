import { describe, expect, it } from 'vitest';
import { CONFIG, OPENINGS } from '../src/config';
import { blindPanels, blindSummary, slatLayout } from '../src/lib/blinds';

const faux = CONFIG.blinds.types['faux-wood'];
const metal = CONFIG.blinds.types.metal;

describe('blind panels', () => {
  it('recess blinds fit inside the window opening with gaps between them', () => {
    const panels = blindPanels(faux, 'recess', 3);
    expect(panels).toHaveLength(3);
    expect(panels[0].a0).toBeGreaterThan(OPENINGS.window.a0);
    expect(panels[2].a1).toBeLessThan(OPENINGS.window.a1);
    expect(panels[1].a0 - panels[0].a1).toBeCloseTo(CONFIG.blinds.panelGap);
    expect(panels[0].top).toBeLessThanOrEqual(OPENINGS.window.b1);
    expect(panels[0].bottom).toBeGreaterThan(OPENINGS.window.b0);
    // Slats stay in front of the window handles (which start ~110mm into the reveal).
    expect(panels[0].slatC + faux.slat / 2).toBeLessThan(100);
  });

  it('face-fit blinds overlap the opening and sit in front of the wall', () => {
    const [p] = blindPanels(metal, 'face', 1);
    expect(p.a1 - p.a0).toBe(CONFIG.window.width + 2 * CONFIG.blinds.face.overlap);
    expect(p.top).toBeGreaterThan(OPENINGS.window.b1);
    expect(p.top).toBeLessThan(CONFIG.room.ceiling);
    expect(p.slatC).toBeLessThan(0);
  });

  it('summarises sizes and warns when a single blind is very wide', () => {
    expect(blindSummary('none', 'recess', 1)).toBe('—');
    expect(blindSummary('faux-wood', 'recess', 3)).toMatch(/^3 × \d+ × \d+ mm/);
    expect(blindSummary('faux-wood', 'face', 1)).toContain('⚠');
  });
});

describe('slat layout', () => {
  const [p] = blindPanels(faux, 'recess', 1);
  it('fully lowered: no slats stacked, rail at the bottom, evenly spaced', () => {
    const { slats, railTop } = slatLayout(faux, p.top, p.bottom, 1);
    expect(slats.length).toBeGreaterThan(20);
    expect(slats.every((s) => !s.stacked)).toBe(true);
    expect(railTop).toBe(p.bottom + faux.bottomRail);
    expect(slats[0].y - slats[1].y).toBeCloseTo(faux.pitch);
  });

  it('fully raised: every slat stacked under the headrail', () => {
    const { slats, railTop, zoneTop } = slatLayout(faux, p.top, p.bottom, 0);
    expect(slats.every((s) => s.stacked)).toBe(true);
    expect(zoneTop - railTop).toBeCloseTo(slats.length * faux.stackPitch);
  });

  it('half raised: slats stay ordered top to bottom and above the rail', () => {
    const { slats, railTop } = slatLayout(metal, p.top, p.bottom, 0.5);
    expect(slats.some((s) => s.stacked)).toBe(true);
    expect(slats.some((s) => !s.stacked)).toBe(true);
    for (let i = 1; i < slats.length; i++) expect(slats[i].y).toBeLessThan(slats[i - 1].y);
    expect(slats[slats.length - 1].y).toBeGreaterThan(railTop);
  });
});
