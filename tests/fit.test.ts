import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { fitCheck } from '../src/lib/fit';

const ceiling = CONFIG.room.ceiling;
const f236 = CONFIG.wardrobes.frames['236'].frameH;
const f201 = CONFIG.wardrobes.frames['201'].frameH;

describe('wardrobe fit check', () => {
  it('flags the original plan (236 frame on a 10cm base) as not fitting', () => {
    const r = fitCheck(ceiling, 100, f236);
    expect(r.clearance).toBe(-4);
    expect(r.level).toBe('error');
  });
  it('build A fits with 96mm', () => {
    expect(fitCheck(ceiling, 0, f236)).toMatchObject({ clearance: 96, level: 'ok' });
  });
  it('build B fits with 46mm', () => {
    expect(fitCheck(ceiling, 50, f236)).toMatchObject({ clearance: 46, level: 'ok' });
  });
  it('build C fits with 348mm', () => {
    expect(fitCheck(ceiling, 100, f201)).toMatchObject({ clearance: 348, level: 'ok' });
  });
  it('warns when tight and errors below IKEA assembly clearance', () => {
    expect(fitCheck(ceiling, 80, f236).level).toBe('warn');
    expect(fitCheck(ceiling, 92, f236).level).toBe('error');
  });
});
