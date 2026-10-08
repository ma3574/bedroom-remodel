// Single source of truth for every measurement (millimetres) and colour.
// Coordinates: origin = floor corner where the bed wall meets the door wall.
// +x along the bed wall towards the window wall, +z from the bed wall towards
// the wardrobe wall, +y up. See PLAN.md §2–§4.

export type BuildId = 'A' | 'B' | 'C';
export type FrameSize = '236' | '201';

export interface WardrobeBuild {
  label: string;
  frame: FrameSize;
  base: number;
}

export interface FrameSpec {
  frameH: number;
  doorH: number;
  panels: number;
  frameArticle: string;
  doorArticle: string;
}

export const CONFIG = {
  room: { width: 4200, depth: 4550, ceiling: 2460 },
  wallThickness: { bed: 100, wardrobe: 100, door: 125, window: 300 },
  /** Freestanding furniture stands this far off the wall (clears the 18mm skirting). */
  furnitureWallGap: 20,

  colours: {
    wall: '#EAE3D7', // Dulux Summer Linen (30YY 79/053)
    trim: '#EAE3D7', // skirting + architrave, same as walls
    ceiling: '#F6F4EF',
    greyBeige: '#CBBFAF', // IKEA grey-beige, sampled from the Bergsbo photo
    floorBase: '#A6917B', // Invictus New England Oak "Sand", swatch average
    floorGrainDark: '#7E6C5A',
    floorGrainLight: '#BFAE98',
    floorGap: '#5A4C3F',
    oak: '#C9A57A',
    bedFabric: '#DDD3C3', // cream soft melange (estimated)
    bedLegs: '#5A3B26',
    windowFrame: '#F4F4F2',
    landingFloor: '#9C978E',
    ensuiteFloor: '#D9D6D0',
    stubWall: '#E8E4DC',
  },

  floor: {
    plank: { w: 102, l: 406, t: 2.5 },
    bevelInset: 0.6,
    centreline: 2275,
    lightnessJitter: [0.88, 1.1] as [number, number],
    textureVariants: 8,
    seed: 20261008,
  },

  skirting: { height: 120, depth: 18, groove: { w: 5, d: 3, fromTop: 20 } },
  architrave: { width: 70, depth: 18, reveal: 5, groove: { w: 5, d: 3, fromOuterEdge: 15 } },
  lining: { thickness: 18, stop: { w: 38, d: 12 } },

  mainDoor: {
    leaf: { w: 762, h: 1981, t: 35 },
    clearOpening: { zStart: 100, width: 768, height: 1995 },
    floorGap: 10,
    /** Degrees. Opens into the room towards the bed wall; ~98° would touch the bed wall. */
    maxAngle: 95,
    handle: { height: 1000, inset: 60 },
  },

  ensuiteDoor: {
    leaf: { w: 838, h: 1981, t: 35 },
    clearOpening: { zCentre: 2275, width: 838, height: 1995 },
    floorGap: 10,
    pull: { height: 1000, inset: 50 },
  },

  window: {
    zCentre: 2235,
    width: 2360,
    height: 1240,
    sill: 1000,
    frame: { profile: 70, depth: 70 },
    revealDepth: 150,
    board: { t: 25, overhang: 30, ears: 40 },
  },

  bed: {
    centreX: 2280, // 180mm right of room centre, per the PDF
    width: 1940,
    length: 2180,
    headboard: { height: 1370, thickness: 100, bottom: 150, cornerRadius: 40, ribPitch: 36 },
    railTop: 400,
    legHeight: 150,
    storageDepth: 150,
    mattress: { w: 1800, l: 2000, h: 250, sinkIntoRail: 50 },
    ottomanMaxAngle: 35,
  },

  bedsideTable: { w: 350, d: 400, h: 550, gapToBed: 0, flutePitch: 25, fluteRadius: 10, topThickness: 20 },

  wardrobes: {
    run: { xStart: 100, units: 4, unitWidth: 1000 },
    frameDepth: 580,
    panelThickness: 18,
    door: { w: 495, t: 19, gapToFrame: 2, sideGap: 2.5, stile: 60, rail: 60, midRail: 45, panelRecess: 4 },
    doorTopBelowFrameTop: 2,
    fillerShadowGap: 3,
    kickRecess: 21,
    frames: {
      '236': { frameH: 2364, doorH: 2294, panels: 5, frameArticle: 'PAX 100×58×236 (004.582.06)', doorArticle: 'BERGSBO 50×229 (505.109.47)' },
      '201': { frameH: 2012, doorH: 1946, panels: 4, frameArticle: 'PAX 100×58×201', doorArticle: 'BERGSBO 50×195 (905.109.45)' },
    } as Record<FrameSize, FrameSpec>,
    builds: {
      A: { label: 'A: 236 frame on floor, 229 doors', frame: '236', base: 0 },
      B: { label: 'B: 236 frame on slim base, 229 doors', frame: '236', base: 50 },
      C: { label: 'C: 201 frame on 10cm base, 195 doors', frame: '201', base: 100 },
    } as Record<BuildId, WardrobeBuild>,
    defaultBuild: 'B' as BuildId, // decided: 236 frame on ~50mm base
    maxDoorAngle: 110,
  },

  dressingTable: { along: 2900, w: 1000, d: 450, h: 760 },

  pendant: { x: 2100, z: 2275, drop: 330 },
};

/** Derived opening positions. `a` is the along-wall coordinate (door wall: a = z; window wall: a = 4550 − z). */
export const OPENINGS = {
  main: {
    a0: CONFIG.mainDoor.clearOpening.zStart,
    a1: CONFIG.mainDoor.clearOpening.zStart + CONFIG.mainDoor.clearOpening.width,
    h: CONFIG.mainDoor.clearOpening.height,
  },
  ensuite: {
    a0: CONFIG.ensuiteDoor.clearOpening.zCentre - CONFIG.ensuiteDoor.clearOpening.width / 2,
    a1: CONFIG.ensuiteDoor.clearOpening.zCentre + CONFIG.ensuiteDoor.clearOpening.width / 2,
    h: CONFIG.ensuiteDoor.clearOpening.height,
  },
  window: {
    a0: CONFIG.room.depth - (CONFIG.window.zCentre + CONFIG.window.width / 2),
    a1: CONFIG.room.depth - (CONFIG.window.zCentre - CONFIG.window.width / 2),
    b0: CONFIG.window.sill,
    b1: CONFIG.window.sill + CONFIG.window.height,
  },
};
