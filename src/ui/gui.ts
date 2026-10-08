// lil-gui control panel bound directly to the State object.
import GUI, { type Controller } from 'lil-gui';
import { CONFIG, type BlindFinish, type BlindType, type BuildId, type PoleFinish } from '../config';
import { HANDLE_OPTIONS } from '../furniture/handles';
import { PENDANT_OPTIONS } from '../furniture/pendant';
import { CAMERA_PRESETS } from '../scene/cameras';
import { PRESET_SUN } from '../scene/lighting';
import type { CameraPreset, State } from '../state';

export type Section =
  | 'floor'
  | 'wardrobes'
  | 'bed'
  | 'bedside'
  | 'dressing'
  | 'blinds'
  | 'curtains'
  | 'pendant'
  | 'lighting'
  | 'visibility'
  | 'colours'
  | 'overlays';

export interface GuiCallbacks {
  dirty: (...s: Section[]) => void;
  preset: (p: CameraPreset) => void;
  walk: () => void;
  eyeHeight: (mm: number) => void;
  screenshot: () => void;
  share: () => void;
  reset: () => void;
  changed: () => void; // persist
}

export interface GuiApi {
  gui: GUI;
  refresh: () => void;
  setFit: (text: string) => void;
  setBlindSize: (text: string) => void;
  setCurtainSize: (text: string) => void;
}

const invert = <T extends string>(o: Record<T, string>): Record<string, T> =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [v as string, k as T]));

export function buildGui(s: State, cb: GuiCallbacks): GuiApi {
  const gui = new GUI({ title: 'Bedroom remodel', width: 320 });
  const on =
    (...sections: Section[]) =>
    () => {
      cb.dirty(...sections);
      cb.changed();
    };

  // View
  const view = gui.addFolder('View');
  const presetNames = Object.fromEntries(Object.entries(CAMERA_PRESETS).map(([k, v]) => [v.label, k])) as Record<string, CameraPreset>;
  view.add(s.view, 'preset', presetNames).name('Camera').onChange((p: CameraPreset) => {
    cb.preset(p);
    cb.changed();
  });
  view.add({ walk: () => cb.walk() }, 'walk').name('🚶 Walk mode (WASD, Esc to exit)');
  view.add(s.view, 'eyeHeight', 1000, 1900, 10).name('Eye height (mm)').onChange((v: number) => {
    cb.eyeHeight(v);
    cb.changed();
  });
  view.add(s.view, 'autoCutaway').name('Auto-hide near walls').onChange(cb.changed);
  view.add(s.view, 'showAllWalls').name('Show all walls').onChange(cb.changed);
  view.add(s.view, 'showCeiling').name('Show ceiling').onChange(cb.changed);

  // Show / hide
  const show = gui.addFolder('Show / hide');
  const showLabels: Record<keyof State['show'], string> = {
    bed: 'Bed',
    bedding: 'Bedding',
    bedsideTables: 'Bedside tables',
    lamps: 'Table lamps',
    dressingTable: 'Dressing table',
    stool: 'Stool',
    mirror: 'Mirror',
    wardrobes: 'Wardrobes',
    fillers: 'MDF fillers',
    pendant: 'Pendant',
    doors: 'Room doors',
  };
  for (const k of Object.keys(showLabels) as (keyof State['show'])[]) {
    show.add(s.show, k).name(showLabels[k]).onChange(on('visibility', 'overlays', 'lighting'));
  }
  show.close();

  // Doors
  const doors = gui.addFolder('Doors');
  doors.add(s.doors, 'mainAngle', 0, CONFIG.mainDoor.maxAngle, 1).name('Main door (°)').onChange(cb.changed);
  doors.add(s.doors, 'ensuiteOpen', 0, 100, 1).name('Ensuite door open %').onChange(cb.changed);
  doors.add(s.doors, 'wardrobeAll', 0, CONFIG.wardrobes.maxDoorAngle, 1).name('All wardrobe doors (°)').onChange(cb.changed);
  const doorFlags = s.doors.wardrobe as unknown as Record<string, boolean>;
  s.doors.wardrobe.forEach((_, i) => doors.add(doorFlags, String(i)).name(`Wardrobe door ${i + 1}`).onChange(cb.changed));
  doors.close();

  // Wardrobes
  const ward = gui.addFolder('Wardrobes');
  const buildOpts: Record<string, BuildId | 'custom'> = {
    ...Object.fromEntries((Object.keys(CONFIG.wardrobes.builds) as BuildId[]).map((k) => [CONFIG.wardrobes.builds[k].label, k])),
    Custom: 'custom',
  };
  let baseCtl: Controller;
  let frameCtl: Controller;
  const buildCtl = ward.add(s.wardrobes, 'build', buildOpts).name('Build').onChange((b: BuildId | 'custom') => {
    if (b !== 'custom') {
      s.wardrobes.frame = CONFIG.wardrobes.builds[b].frame;
      s.wardrobes.base = CONFIG.wardrobes.builds[b].base;
      baseCtl.updateDisplay();
      frameCtl.updateDisplay();
    }
    on('wardrobes', 'overlays')();
  });
  const markCustom = () => {
    const b = s.wardrobes.build;
    if (b !== 'custom') {
      const spec = CONFIG.wardrobes.builds[b];
      if (spec.base !== s.wardrobes.base || spec.frame !== s.wardrobes.frame) {
        s.wardrobes.build = 'custom';
        buildCtl.updateDisplay();
      }
    }
    on('wardrobes', 'overlays')();
  };
  frameCtl = ward.add(s.wardrobes, 'frame', { '236 cm frame + 229 doors': '236', '201 cm frame + 195 doors': '201' }).name('Frame').onChange(markCustom);
  baseCtl = ward.add(s.wardrobes, 'base', 0, 150, 1).name('Base height (mm)').onChange(markCustom);
  const fit = { text: '' };
  const fitCtl = ward.add(fit, 'text').name('Fit check').disable();
  ward.add(s.wardrobes, 'handle', invert(HANDLE_OPTIONS)).name('Handles').onChange(on('wardrobes'));
  ward.add(s.wardrobes, 'handleHeight', 900, 1200, 5).name('Handle height (mm)').onChange(on('wardrobes'));
  ward.addColor(s.wardrobes, 'colour').name('Colour (doors + MDF)').onChange(on('colours'));

  // Bed
  const bed = gui.addFolder('Bed');
  bed.add(s.bed, 'offset', -400, 400, 5).name('Offset from centre (mm)').onChange(on('bed', 'bedside', 'overlays'));
  bed.add(s.bed, 'ottoman').name('Lift ottoman').onChange(cb.changed);
  bed.addColor(s.bed, 'fabric').name('Fabric').onChange(on('colours'));
  bed.close();

  // Bedside tables
  const bs = gui.addFolder('Bedside tables');
  bs.add(s.bedside, 'w', 300, 600, 5).name('Width (mm)').onChange(on('bedside', 'overlays'));
  bs.add(s.bedside, 'd', 300, 500, 5).name('Depth (mm)').onChange(on('bedside', 'overlays'));
  bs.add(s.bedside, 'h', 400, 700, 5).name('Height (mm)').onChange(on('bedside'));
  bs.add(s.bedside, 'gap', 0, 100, 1).name('Gap to bed (mm)').onChange(on('bedside', 'overlays'));
  bs.add(s.bedside, 'finish', { Oak: 'oak', 'Cream fabric': 'cream', 'Grey-beige': 'grey-beige', Walnut: 'walnut' }).name('Finish').onChange(on('bedside'));
  bs.close();

  // Dressing table
  const dt = gui.addFolder('Dressing table');
  dt.add(s.dressing, 'wall', { 'Window wall': 'window', 'Door wall': 'door', 'Bed wall': 'bed' }).name('Wall').onChange(on('dressing', 'overlays'));
  dt.add(s.dressing, 'along', 300, 4200, 10).name('Position along wall (mm)').onChange(on('dressing', 'overlays'));
  dt.add(s.dressing, 'w', 600, 1400, 10).name('Width (mm)').onChange(on('dressing', 'overlays'));
  dt.add(s.dressing, 'd', 350, 600, 5).name('Depth (mm)').onChange(on('dressing', 'overlays'));
  dt.close();

  // Blinds
  const bl = gui.addFolder('Blinds');
  const blindTypes: Record<string, BlindType> = { None: 'none' };
  for (const [k, v] of Object.entries(CONFIG.blinds.types)) blindTypes[v.label] = k as BlindType;
  const finishes: Record<string, BlindFinish> = {};
  for (const [k, v] of Object.entries(CONFIG.blinds.finishes)) finishes[v.label] = k as BlindFinish;
  let finishCtl: Controller;
  bl.add(s.blinds, 'type', blindTypes).name('Type').onChange((t: BlindType) => {
    if (t !== 'none') {
      s.blinds.finish = CONFIG.blinds.types[t].defaultFinish;
      finishCtl.updateDisplay();
    }
    on('blinds', 'curtains', 'overlays')();
  });
  finishCtl = bl.add(s.blinds, 'finish', finishes).name('Finish').onChange(on('blinds'));
  bl.add(s.blinds, 'mount', { 'Inside the recess': 'recess', 'Outside (face fit)': 'face' }).name('Fitting').onChange(on('blinds', 'curtains', 'overlays'));
  bl.add(s.blinds, 'panels', 1, 3, 1).name('Number of blinds').onChange(on('blinds'));
  bl.add(s.blinds, 'lowered', 0, 100, 1).name('Lowered %').onChange(cb.changed);
  bl.add(s.blinds, 'tilt', -80, 80, 1).name('Slat tilt (°)').onChange(cb.changed);
  const blindSize = { text: '' };
  const blindSizeCtl = bl.add(blindSize, 'text').name('Each blind').disable();
  bl.close();

  // Curtains
  const cu = gui.addFolder('Curtains');
  cu.add(s.curtains, 'enabled').name('Show curtains').onChange(on('curtains', 'overlays'));
  cu.add(s.curtains, 'open', 0, 100, 1).name('Open % (0 = closed)').onChange(cb.changed);
  cu.add(s.curtains, 'drop', { 'Sill length (hem 990)': 'sill', 'Below sill (hem 850)': 'below-sill', 'Floor length (hem 10)': 'floor' })
    .name('Length')
    .onChange(on('curtains', 'overlays'));
  cu.add(s.curtains, 'hardware', { Pole: 'pole', Track: 'track' }).name('Hanging').onChange(on('curtains'));
  const poleFinishes: Record<string, PoleFinish> = {};
  for (const [k, v] of Object.entries(CONFIG.curtains.finishes)) poleFinishes[v.label] = k as PoleFinish;
  cu.add(s.curtains, 'finish', poleFinishes).name('Pole finish').onChange(on('curtains'));
  cu.add(s.curtains, 'extend', 100, 400, 10).name('Beyond window each side (mm)').onChange(on('curtains', 'overlays'));
  cu.add(s.curtains, 'above', 60, 200, 5).name('Pole above window (mm)').onChange(on('curtains'));
  cu.add(s.curtains, 'fullness', 1.8, 2.8, 0.05).name('Fullness').onChange(on('curtains'));
  cu.addColor(s.curtains, 'colour').name('Fabric colour').onChange(on('curtains'));
  const curtainSize = { text: '' };
  const curtainSizeCtl = cu.add(curtainSize, 'text').name('Order size').disable();
  cu.close();

  // Floor
  const fl = gui.addFolder('Floor');
  fl.add(s.floor, 'axis', { 'Across (parallel to wardrobes)': 'x', 'Along (towards wardrobes)': 'z' }).name('Herringbone direction').onChange(on('floor'));
  fl.add(s.floor, 'flip').name('Flip arrow').onChange(on('floor'));
  fl.add(s.floor, 'centreline', 0, 4550, 5).name('Centreline (mm)').onChange(on('floor'));
  fl.addColor(s.floor, 'tint').name('Tint').onChange(on('colours'));
  fl.add(s.floor, 'brightness', 0.6, 1.4, 0.01).name('Brightness').onChange(on('colours'));
  fl.add(s.floor, 'gaps').name('Bevel gaps').onChange(on('floor'));
  fl.close();

  // Colours
  const col = gui.addFolder('Colours');
  col.addColor(s.colours, 'wall').name('Walls (Summer Linen)').onChange(on('colours'));
  col.addColor(s.colours, 'trim').name('Skirting + architrave').onChange(on('colours'));
  col.addColor(s.colours, 'ceiling').name('Ceiling').onChange(on('colours'));
  col.close();

  // Lighting
  const li = gui.addFolder('Lighting');
  const sunCtls: Controller[] = [];
  let pendantOnCtl: Controller;
  li.add(s.lighting, 'preset', { Day: 'day', Evening: 'evening', Night: 'night' }).name('Preset').onChange(() => {
    const sun = PRESET_SUN[s.lighting.preset];
    s.lighting.sunAzimuth = sun.azimuth;
    s.lighting.sunElevation = sun.elevation;
    s.lighting.pendantOn = s.lighting.preset !== 'day';
    for (const c of sunCtls) c.updateDisplay();
    pendantOnCtl.updateDisplay();
    on('lighting')();
  });
  sunCtls.push(li.add(s.lighting, 'sunAzimuth', -80, 80, 1).name('Sun direction (°)').onChange(on('lighting')));
  sunCtls.push(li.add(s.lighting, 'sunElevation', 3, 70, 1).name('Sun height (°)').onChange(on('lighting')));
  pendantOnCtl = li.add(s.lighting, 'pendantOn').name('Pendant on').onChange(on('lighting'));
  li.add(s.lighting, 'pendantStyle', invert(PENDANT_OPTIONS)).name('Pendant style').onChange(on('pendant', 'lighting'));
  li.add(s.lighting, 'pendantDrop', 200, 600, 5).name('Pendant drop (mm)').onChange(on('pendant', 'lighting'));
  li.add(s.lighting, 'pendantIntensity', 5, 150, 1).name('Pendant brightness').onChange(on('lighting'));
  li.add(s.lighting, 'exposure', 0.4, 2.2, 0.01).name('Exposure').onChange(on('lighting'));
  li.add(s.lighting, 'hqShadows').name('Pendant shadows').onChange(on('lighting'));
  li.close();

  // Overlays
  const ov = gui.addFolder('Overlays');
  ov.add(s.overlays, 'swings').name('Door swing arcs').onChange(on('overlays'));
  ov.add(s.overlays, 'clearances').name('Clearances').onChange(on('overlays'));
  ov.add(s.overlays, 'dimensions').name('Room dimensions').onChange(on('overlays'));
  ov.add(s.overlays, 'pocketZone').name('Pocket door cavity').onChange(on('overlays'));
  ov.add(s.overlays, 'grid').name('100mm grid').onChange(on('overlays'));

  // Actions
  const act = gui.addFolder('Actions');
  act.add({ f: cb.screenshot }, 'f').name('📷 Screenshot (PNG)');
  act.add({ f: cb.share }, 'f').name('🔗 Copy share link');
  act.add({ f: cb.reset }, 'f').name('↺ Reset to defaults');

  return {
    gui,
    refresh: () => {
      for (const c of gui.controllersRecursive()) c.updateDisplay();
    },
    setFit: (text: string) => {
      fit.text = text;
      fitCtl.updateDisplay();
    },
    setBlindSize: (text: string) => {
      blindSize.text = text;
      blindSizeCtl.updateDisplay();
    },
    setCurtainSize: (text: string) => {
      curtainSize.text = text;
      curtainSizeCtl.updateDisplay();
    },
  };
}
