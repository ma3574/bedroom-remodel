import { describe, expect, it } from 'vitest';
import { CONFIG, OPENINGS } from '../src/config';
import { computeClearances } from '../src/overlays/overlays';
import { curtainLayout, curtainSettingsFrom, curtainSpan, curtainSummary, foldAmplitude } from '../src/lib/curtains';
import { defaultState } from '../src/state';

const C = CONFIG.curtains;

describe('curtain layout', () => {
  const s = defaultState();
  const L = curtainLayout(curtainSettingsFrom(s));

  it('pole spans the window plus the extension each side, below the ceiling', () => {
    expect(L.a1 - L.a0).toBe(CONFIG.window.width + 2 * C.extendEachSide);
    expect(L.closedSpan * 2).toBe(L.a1 - L.a0);
    expect(L.hardwareY).toBe(OPENINGS.window.b1 + C.aboveWindow);
    expect(L.hardwareY + C.pole.finial / 2).toBeLessThan(CONFIG.room.ceiling);
    expect(L.top).toBeLessThan(L.hardwareY);
  });

  it('hem heights follow the chosen length', () => {
    expect(L.bottom).toBe(C.drops['below-sill']);
    const floor = curtainLayout({ ...curtainSettingsFrom(s), drop: 'floor' });
    expect(floor.bottom).toBe(10);
    expect(curtainSummary(floor, 'pole')).toMatch(/^Pole 2760 × drop \d+ mm/);
  });

  it('span goes from closed to the stack width', () => {
    expect(curtainSpan(L, 0)).toBe(L.closedSpan);
    expect(curtainSpan(L, 100)).toBeCloseTo(L.stackSpan);
    expect(L.stackSpan).toBeLessThan(L.closedSpan / 2);
  });

  it('folds deepen as the curtain gathers, and never touch the window board', () => {
    expect(foldAmplitude(1000, 1000, 10)).toBe(0);
    const closed = foldAmplitude(L.flatWidth, L.closedSpan, L.folds);
    const open = foldAmplitude(L.flatWidth, L.stackSpan, L.folds);
    expect(open).toBeGreaterThan(closed);
    // Worst case depth incl. bottom flare (18%) and fold variation (15%) stays in front of the 30mm board.
    expect(L.c + open * 1.18 * 1.15).toBeLessThan(-CONFIG.window.board.overhang);
  });

  it('moves the pole out when blinds are face fitted', () => {
    const face = curtainLayout({ ...curtainSettingsFrom(s), faceBlinds: true });
    expect(face.c).toBeLessThan(L.c);
  });
});

describe('curtain vs dressing table clearance', () => {
  it('below-sill curtains clear the table, floor-length ones clash', () => {
    const s = defaultState();
    const find = () => computeClearances(s).find((c) => c.name.startsWith('Curtain hem'));
    expect(find()?.gap).toBeGreaterThan(0);
    s.curtains.drop = 'floor';
    expect(find()?.gap).toBeLessThan(0);
    expect(find()?.note).toContain('hit the dressing table');
  });
});
