export type FitLevel = 'error' | 'warn' | 'ok';

export interface FitResult {
  /** Space between the top of the PAX frame and the ceiling, mm. */
  clearance: number;
  level: FitLevel;
  message: string;
}

/** IKEA needs at least 6mm above the frame to stand it up during assembly. */
export const IKEA_ASSEMBLY_CLEARANCE = 6;
export const TIGHT_CLEARANCE = 25;

const fmt = (v: number) => `${Math.round(v * 10) / 10}`;

export function fitCheck(ceiling: number, base: number, frameH: number): FitResult {
  const clearance = Math.round((ceiling - base - frameH) * 10) / 10;
  if (clearance < 0) {
    return {
      clearance,
      level: 'error',
      message: `Doesn't fit: frame + base is ${fmt(-clearance)} mm taller than the ceiling`,
    };
  }
  if (clearance < IKEA_ASSEMBLY_CLEARANCE) {
    return {
      clearance,
      level: 'error',
      message: `Only ${fmt(clearance)} mm above the frame: IKEA needs ≥ ${IKEA_ASSEMBLY_CLEARANCE} mm to assemble upright`,
    };
  }
  if (clearance < TIGHT_CLEARANCE) {
    return {
      clearance,
      level: 'warn',
      message: `Very tight (${fmt(clearance)} mm): floors and ceilings are rarely level, measure in several places`,
    };
  }
  return { clearance, level: 'ok', message: `Fits: ${fmt(clearance)} mm above the frame` };
}
