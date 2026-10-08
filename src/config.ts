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

export type BedsideStyle = 'fluted' | 'reeded-oak';
export type BlindType = 'none' | 'faux-wood' | 'metal';
export type BlindMount = 'recess' | 'face';
export type BlindFinish = 'white' | 'linen' | 'grey-beige' | 'oak' | 'silver' | 'black';

export interface BlindSpec {
  label: string;
  slat: number; // slat width (front to back), mm
  thickness: number;
  pitch: number; // vertical spacing when lowered
  stackPitch: number; // spacing when raised into the stack
  headrail: { h: number; d: number };
  bottomRail: number; // height
  valance: number; // 0 = none
  cord: number; // ladder cord radius
  typicalMaxWidth: number;
  defaultFinish: BlindFinish;
}

export type CurtainDrop = 'sill' | 'below-sill' | 'floor';
export type CurtainHardware = 'pole' | 'track';
export type PoleFinish = 'antique-brass' | 'matt-black' | 'brushed-nickel' | 'white';

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
  /** Selectable bedside table designs; switching style resets W/D/H to these. */
  bedsideStyles: {
    fluted: { label: 'Generic fluted box', w: 350, d: 400, h: 550 },
    // From the supplied photos (no product link): proportions W ≈ 0.80·H, D ≈ 0.75·H.
    'reeded-oak': { label: 'Rounded reeded oak, 2 drawers', w: 450, d: 420, h: 560 },
  } as Record<BedsideStyle, { label: string; w: number; d: number; h: number }>,
  reededTable: {
    legHeight: 120,
    legDiameter: 38,
    legInset: { x: 70, z: 50 },
    topThickness: 20,
    baseThickness: 18,
    cornerRadius: 80,
    reedPitch: 21,
    reedDepth: 6,
    drawerGap: 4,
    handle: { length: 110, diameter: 18, posts: 70, standoff: 24 },
  },

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

  blinds: {
    types: {
      'faux-wood': {
        label: 'Faux wood 50mm',
        slat: 50,
        thickness: 3,
        pitch: 43,
        stackPitch: 6.5,
        headrail: { h: 50, d: 60 },
        bottomRail: 20,
        valance: 75,
        cord: 1.4,
        typicalMaxWidth: 2400,
        defaultFinish: 'white',
      },
      metal: {
        label: 'Venetian aluminium 25mm',
        slat: 25,
        thickness: 0.8,
        pitch: 21,
        stackPitch: 2.6,
        headrail: { h: 25, d: 25 },
        bottomRail: 10,
        valance: 0,
        cord: 0.8,
        typicalMaxWidth: 2400,
        defaultFinish: 'silver',
      },
    } as Record<Exclude<BlindType, 'none'>, BlindSpec>,
    finishes: {
      white: { label: 'Brilliant white', colour: '#F4F2EE' },
      linen: { label: 'Linen', colour: '#E6DDCC' },
      'grey-beige': { label: 'Grey-beige (match wardrobes)', colour: '#CBBFAF' },
      oak: { label: 'Light oak effect', colour: '#ffffff', grain: true },
      silver: { label: 'Brushed silver', colour: '#C9CCCF', metallic: true },
      black: { label: 'Matt black', colour: '#262626' },
    } as Record<BlindFinish, { label: string; colour: string; grain?: boolean; metallic?: boolean }>,
    /** Inside the 150mm reveal, in front of the window handles. */
    recess: { sideClearance: 5, topGap: 2, frontInset: 15 },
    /** On the wall above the opening, overlapping each side. */
    face: { overlap: 100, above: 100, standoff: 35 },
    sillGap: 5, // bottom rail clearance above the window board
    panelGap: 5, // between neighbouring blinds
  },

  /** Touched By Design "Luminaire" Forest Green: pencil pleat pair, thermal blackout lining, no tiebacks. */
  curtains: {
    fabric: {
      name: 'Luminaire Forest Green',
      colour: '#424B3B', // swatch average
      dark: '#232F25',
      light: '#68765D',
      sheen: '#7F9173',
      lining: '#ECE7DC', // thermal blackout lining (ivory)
      boltWidth: 1400, // fabric roll width; curtains are made in half widths
    },
    headingTape: 75, // pencil pleat tape depth
    fullness: 2.25, // flat fabric width ÷ covered width when closed
    foldPitch: 110, // approx. one soft fold per 110mm of pole when closed
    stackRatio: 0.12, // open stack width ≈ 12% of the flat fabric width
    extendEachSide: 200, // pole/track beyond the window opening, so curtains stack off the glass
    aboveWindow: 150, // window head to pole centre
    projection: 130, // wall to pole centre (fabric centreline); folds clear the window board
    projectionWithFaceBlinds: 210, // pushed out to clear face-fitted blinds and valance
    drops: { sill: 990, 'below-sill': 850, floor: 10 } as Record<CurtainDrop, number>, // hem height above floor
    pole: { diameter: 28, finial: 55, ringRadius: 22, ringTube: 3 },
    track: { w: 20, h: 16 },
    finishes: {
      'antique-brass': { label: 'Antique brass', colour: '#A0824F', metalness: 1, roughness: 0.38 },
      'matt-black': { label: 'Matt black', colour: '#1E1E1E', metalness: 0.5, roughness: 0.5 },
      'brushed-nickel': { label: 'Brushed nickel', colour: '#BFC2C4', metalness: 1, roughness: 0.32 },
      white: { label: 'White', colour: '#F2F0EB', metalness: 0, roughness: 0.4 },
    } as Record<PoleFinish, { label: string; colour: string; metalness: number; roughness: number }>,
  },

  pendant: { x: 2100, z: 2275, drop: 330 },

  /** Daikin FTXP25M (Comfora) wall-mounted indoor unit, in the bed-wall / window-wall corner. */
  aircon: {
    model: 'Daikin FTXP25M',
    w: 770,
    h: 286,
    d: 225,
    gapToWindowWall: 100,
    gapToCeiling: 100,
    // Installer guide (FTXP-M): ≥ 50mm to walls and ceiling; install ≥ 1.8m above the floor.
    minClearance: 50,
    minHeight: 1800,
    flapMaxAngle: 60,
    airflowAngle: 35, // degrees below horizontal with the flap open
  },
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
