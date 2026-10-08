import { describe, expect, it } from 'vitest';
import { defaultState, decodeState, encodeState, mergeInto, stateFromEncoded } from '../src/state';
import { wardrobeDims } from '../src/layout';

describe('state share links', () => {
  it('round-trips changed values', () => {
    const s = defaultState();
    s.wardrobes.handle = 'eneryda-brass-35';
    s.doors.wardrobe[3] = true;
    s.bed.offset = -120;
    s.lighting.preset = 'night';
    expect(stateFromEncoded(encodeState(s))).toEqual(s);
  });

  it('encodes defaults as an empty diff', () => {
    expect(decodeState(encodeState(defaultState()))).toEqual({});
  });

  it('falls back to defaults for corrupt input', () => {
    expect(decodeState('%%%not-base64')).toBeNull();
    expect(stateFromEncoded('%%%not-base64')).toEqual(defaultState());
    expect(stateFromEncoded(null)).toEqual(defaultState());
  });

  it('ignores unknown keys and wrong types', () => {
    const s = defaultState();
    mergeInto(s, { bed: { offset: 'far', ottoman: true, evil: 1 }, doors: { wardrobe: [true] }, nope: {} });
    expect(s.bed.offset).toBe(defaultState().bed.offset);
    expect(s.bed.ottoman).toBe(true);
    expect((s.bed as Record<string, unknown>).evil).toBeUndefined();
    expect(s.doors.wardrobe).toEqual(defaultState().doors.wardrobe);
  });
});

describe('wardrobe dims (build B default)', () => {
  it('derives door positions and filler height', () => {
    const d = wardrobeDims(defaultState());
    expect(d.doorFaceZ).toBe(3949);
    expect(d.doorTop).toBe(2412);
    expect(d.doorBottom).toBe(118);
    expect(d.topFiller).toBe(48);
    expect(d.panels).toBe(5);
  });
});
