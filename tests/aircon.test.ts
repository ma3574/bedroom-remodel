import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { acFit, acPlacement } from '../src/lib/aircon';
import { bedRect } from '../src/layout';
import { defaultState } from '../src/state';

describe('aircon placement', () => {
  it('sits in the bed-wall / window-wall corner with the stated 100mm gaps', () => {
    const p = acPlacement(100, 100);
    expect(p.x1).toBe(CONFIG.room.width - 100);
    expect(p.x1 - p.x0).toBe(770);
    expect(p.y1).toBe(CONFIG.room.ceiling - 100);
    expect(p.y0).toBe(2074);
    expect(p.z1).toBe(225);
  });

  it('meets the installer guide clearances at 100mm, fails below 50mm', () => {
    expect(acFit(100, 100).level).toBe('ok');
    expect(acFit(40, 100).level).toBe('error');
    expect(acFit(100, 30).level).toBe('error');
  });

  it('is just to the right of the headboard with the bed where the PDF puts it', () => {
    const p = acPlacement(100, 100);
    const bed = bedRect(defaultState());
    expect(p.x0).toBeGreaterThan(bed.x1); // clears the headboard edge
    expect(p.y0).toBeGreaterThan(CONFIG.bed.headboard.height);
  });
});
