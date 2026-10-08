// Placement and clearance check for the wall-mounted AC unit (room mm).
import { CONFIG } from '../config';
import type { FitLevel } from './fit';

export interface AcPlacement {
  x0: number;
  x1: number;
  y0: number; // underside
  y1: number; // top
  z0: number; // against the bed wall
  z1: number; // front face
}

export function acPlacement(gapToWindowWall: number, gapToCeiling: number): AcPlacement {
  const A = CONFIG.aircon;
  const x1 = CONFIG.room.width - gapToWindowWall;
  const y1 = CONFIG.room.ceiling - gapToCeiling;
  return { x0: x1 - A.w, x1, y0: y1 - A.h, y1, z0: 0, z1: A.d };
}

export function acFit(gapToWindowWall: number, gapToCeiling: number): { level: FitLevel; message: string } {
  const A = CONFIG.aircon;
  const p = acPlacement(gapToWindowWall, gapToCeiling);
  const problems: string[] = [];
  if (gapToWindowWall < A.minClearance) problems.push(`${gapToWindowWall} mm to the window wall`);
  if (gapToCeiling < A.minClearance) problems.push(`${gapToCeiling} mm to the ceiling`);
  if (p.y0 < A.minHeight) problems.push(`underside only ${p.y0} mm above the floor`);
  if (problems.length) {
    return { level: 'error', message: `✕ ${problems.join(', ')} (manual: ≥ ${A.minClearance} mm, ≥ ${A.minHeight} mm up)` };
  }
  return { level: 'ok', message: `✓ ${gapToWindowWall} mm to wall, ${gapToCeiling} mm to ceiling, underside ${p.y0} mm up` };
}
