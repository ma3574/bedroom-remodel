// Planning overlays: door swing arcs, pocket-door no-fix zone, live clearances, room dimensions, grid.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { CONFIG, OPENINGS } from '../config';
import { bedRect, bedsideRects, dressingRect, rectGap, wardrobeDims, wardrobeDoor, type Rect } from '../layout';
import { acPlacement } from '../lib/aircon';
import { curtainLayout, curtainSettingsFrom } from '../lib/curtains';
import type { State } from '../state';
import { mm } from '../units';

const COLOURS = { swing: '#3A7BD5', ok: '#1F8A70', warn: '#E0A100', bad: '#D64545', dim: '#3B3F46', zone: '#D64545' };
const Y = 0.0045; // just above the plank tops

function overlayMat(colour: string, opacity: number, onTop = false): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: colour,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: !onTop,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
}

function own<T extends THREE.Object3D>(o: T): T {
  o.userData.ownMaterial = true;
  o.renderOrder = 10;
  return o;
}

/** Filled floor sector; angles in radians measured from +x towards +z. */
function sector(cx: number, cz: number, r: number, a0: number, a1: number, colour: string): THREE.Group {
  const seg = 40;
  const pos: number[] = [];
  const outline: THREE.Vector3[] = [new THREE.Vector3(mm(cx), Y, mm(cz))];
  for (let i = 0; i < seg; i++) {
    const t0 = a0 + ((a1 - a0) * i) / seg;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / seg;
    pos.push(mm(cx), Y, mm(cz));
    pos.push(mm(cx + r * Math.cos(t0)), Y, mm(cz + r * Math.sin(t0)));
    pos.push(mm(cx + r * Math.cos(t1)), Y, mm(cz + r * Math.sin(t1)));
  }
  for (let i = 0; i <= seg; i++) {
    const t = a0 + ((a1 - a0) * i) / seg;
    outline.push(new THREE.Vector3(mm(cx + r * Math.cos(t)), Y, mm(cz + r * Math.sin(t))));
  }
  outline.push(outline[0].clone());
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const grp = new THREE.Group();
  grp.add(own(new THREE.Mesh(g, overlayMat(colour, 0.16))));
  grp.add(own(new THREE.Line(new THREE.BufferGeometry().setFromPoints(outline), new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.7 }))));
  return grp;
}

/** Flat ribbon between two floor points (mm) with end ticks. */
function measure(p: [number, number], q: [number, number], colour: string, y = Y, onTop = false): THREE.Group {
  const grp = new THREE.Group();
  const dx = q[0] - p[0];
  const dz = q[1] - p[1];
  const len = Math.hypot(dx, dz);
  if (len < 1) return grp;
  const ang = Math.atan2(dz, dx);
  const mat = overlayMat(colour, 0.95, onTop);
  const bar = own(new THREE.Mesh(new THREE.PlaneGeometry(mm(len), mm(10)), mat));
  bar.rotation.set(-Math.PI / 2, 0, -ang);
  bar.position.set(mm((p[0] + q[0]) / 2), y, mm((p[1] + q[1]) / 2));
  grp.add(bar);
  for (const e of [p, q]) {
    const tick = own(new THREE.Mesh(new THREE.PlaneGeometry(mm(10), mm(120)), mat.clone()));
    tick.rotation.set(-Math.PI / 2, 0, -ang);
    tick.position.set(mm(e[0]), y, mm(e[1]));
    grp.add(tick);
  }
  return grp;
}

function label(text: string, x: number, y: number, z: number, cls = ''): CSS2DObject {
  const el = document.createElement('div');
  el.className = `ov-label ${cls}`;
  el.textContent = text;
  const o = new CSS2DObject(el);
  o.position.set(mm(x), mm(y), mm(z));
  return o;
}

interface Clearance {
  name: string;
  p: [number, number];
  q: [number, number];
  gap: number;
  warnBelow: number;
  /** Optional label text replacing the default "name: gap". */
  note?: string;
}

export function computeClearances(s: State): Clearance[] {
  const R = CONFIG.room;
  const bed = bedRect(s);
  const [lt, rt] = bedsideRects(s);
  const wd = wardrobeDims(s);
  const out: Clearance[] = [];
  const midZ = Math.min(bed.z1 - 300, 1100);
  const cx = (bed.x0 + bed.x1) / 2;
  if (s.show.bed) {
    if (s.show.wardrobes) out.push({ name: 'Bed → wardrobes', p: [cx, bed.z1], q: [cx, wd.doorFaceZ], gap: wd.doorFaceZ - bed.z1, warnBelow: 700 });
    out.push({ name: 'Bed → window wall', p: [bed.x1, midZ], q: [R.width, midZ], gap: R.width - bed.x1, warnBelow: 600 });
    out.push({ name: 'Bed → door wall', p: [0, midZ], q: [bed.x0, midZ], gap: bed.x0, warnBelow: 600 });
  }
  if (s.show.bedsideTables) {
    const reach = CONFIG.mainDoor.leaf.w;
    const z = OPENINGS.main.a0 + 20;
    out.push({ name: 'Open door → bedside table', p: [reach, z], q: [lt.x0, z], gap: lt.x0 - reach, warnBelow: 30 });
  }
  if (s.show.dressingTable) {
    const dt = dressingRect(s);
    const obstacles: [string, Rect][] = [];
    if (s.show.wardrobes) obstacles.push(['wardrobe door swing', { x0: CONFIG.wardrobes.run.xStart, x1: R.width - CONFIG.wardrobes.run.xStart, z0: wd.doorFaceZ - CONFIG.wardrobes.door.w, z1: wd.doorFaceZ }]);
    if (s.show.bed) obstacles.push(['bed', bed]);
    if (s.show.bedsideTables) obstacles.push(['bedside table', lt], ['bedside table', rt]);
    obstacles.push(['main door swing', { x0: 0, x1: CONFIG.mainDoor.leaf.w, z0: OPENINGS.main.a0, z1: OPENINGS.main.a0 + CONFIG.mainDoor.leaf.w }]);
    let best: Clearance | null = null;
    for (const [name, r] of obstacles) {
      const g = rectGap(dt, r);
      if (!best || g.gap < best.gap) best = { name: `Dressing table → ${name}`, p: g.p, q: g.q, gap: g.gap, warnBelow: 50 };
    }
    if (best) out.push(best);
    if (s.curtains.enabled && s.dressing.wall === 'window') {
      const L = curtainLayout(curtainSettingsFrom(s));
      const zMin = R.depth - L.a1;
      const zMax = R.depth - L.a0;
      const z0 = Math.max(dt.z0, zMin);
      const z1 = Math.min(dt.z1, zMax);
      if (z1 > z0) {
        const top = CONFIG.dressingTable.h;
        const gap = L.bottom - top;
        const z = (z0 + z1) / 2;
        out.push({
          name: 'Curtain hem → dressing table top',
          p: [R.width + L.c, z],
          q: [dt.x0, z],
          gap,
          warnBelow: 30,
          note: gap <= 0 ? `Curtains hit the dressing table (hem ${L.bottom} mm, table top ${top} mm)` : undefined,
        });
      }
    }
  }
  return out;
}

export function buildOverlays(s: State): THREE.Group {
  const group = new THREE.Group();
  group.name = 'overlays';
  const R = CONFIG.room;
  const wd = wardrobeDims(s);
  const { main, ensuite } = OPENINGS;

  if (s.overlays.swings) {
    const hingeZ = main.a0 + 3;
    group.add(sector(0, hingeZ, CONFIG.mainDoor.leaf.w, Math.PI / 2 - (CONFIG.mainDoor.maxAngle * Math.PI) / 180, Math.PI / 2, COLOURS.swing));
    if (s.show.wardrobes) {
      for (let i = 0; i < 8; i++) {
        const d = wardrobeDoor(i);
        const z = wd.doorFaceZ;
        if (d.hingeLeft) group.add(sector(d.hingeX, z, CONFIG.wardrobes.door.w, -Math.PI / 2, 0, COLOURS.swing));
        else group.add(sector(d.hingeX, z, CONFIG.wardrobes.door.w, Math.PI, Math.PI * 1.5, COLOURS.swing));
      }
    }
  }

  if (s.overlays.pocketZone) {
    const z0 = ensuite.a1;
    const z1 = ensuite.a1 + CONFIG.ensuiteDoor.leaf.w;
    const zone = own(new THREE.Mesh(new THREE.PlaneGeometry(mm(z1 - z0), mm(2000)), overlayMat(COLOURS.zone, 0.22)));
    zone.rotation.y = Math.PI / 2;
    zone.position.set(0.004, 1.0, mm((z0 + z1) / 2));
    group.add(zone);
    group.add(label("Pocket door cavity: don't fix into this wall", 30, 1500, (z0 + z1) / 2, 'warn'));
  }

  if (s.overlays.clearances) {
    for (const c of computeClearances(s)) {
      const colour = c.gap <= 0 ? COLOURS.bad : c.gap < c.warnBelow ? COLOURS.warn : COLOURS.ok;
      group.add(measure(c.p, c.q, colour));
      const cls = c.gap <= 0 ? 'bad' : c.gap < c.warnBelow ? 'warn' : 'ok';
      const text = c.note ?? (c.gap <= 0 ? `${c.name}: overlaps ${Math.round(-c.gap)} mm` : `${c.name}: ${Math.round(c.gap)} mm`);
      group.add(label(text, (c.p[0] + c.q[0]) / 2, 30, (c.p[1] + c.q[1]) / 2, cls));
    }
  }

  if (s.overlays.dimensions) {
    const y = 10;
    // [from, to, text, label position along the line 0..1]
    const dims: [[number, number], [number, number], string, number][] = [
      [[0, -260], [R.width, -260], `${R.width} bed wall · ceiling ${R.ceiling}`, 0.5],
      [[0, R.depth + 260], [R.width, R.depth + 260], `${R.width} wardrobe wall`, 0.5],
      [[-300, 0], [-300, R.depth], `${R.depth} door wall`, 0.9],
      [[R.width + 420, 0], [R.width + 420, R.depth], `${R.depth} window wall`, 0.9],
    ];
    for (const [p, q, text, t] of dims) {
      group.add(measure(p, q, COLOURS.dim, mm(y), true));
      group.add(label(text, p[0] + (q[0] - p[0]) * t, y, p[1] + (q[1] - p[1]) * t, 'dim'));
    }
    group.add(label(`Main door ${CONFIG.mainDoor.leaf.w} × ${CONFIG.mainDoor.leaf.h}`, 520, 10, (main.a0 + main.a1) / 2 + 120, 'dim'));
    group.add(label(`Ensuite pocket door ${CONFIG.ensuiteDoor.leaf.w} × ${CONFIG.ensuiteDoor.leaf.h}`, 620, 10, (ensuite.a0 + ensuite.a1) / 2, 'dim'));
    group.add(label(`Window ${CONFIG.window.width} × ${CONFIG.window.height}, sill ≈${CONFIG.window.sill}`, R.width - 700, 10, CONFIG.window.zCentre - 250, 'dim'));
    if (s.show.aircon) {
      const ac = acPlacement(s.aircon.gapToWindowWall, s.aircon.gapToCeiling);
      group.add(
        label(
          `AC ${CONFIG.aircon.w}×${CONFIG.aircon.h}×${CONFIG.aircon.d}: ${s.aircon.gapToWindowWall} from wall, ${s.aircon.gapToCeiling} from ceiling`,
          (ac.x0 + ac.x1) / 2,
          ac.y1,
          ac.z1 + 120,
          'dim',
        ),
      );
    }
  }

  if (s.overlays.grid) {
    const grid = new THREE.GridHelper(5, 50, '#555555', '#777777');
    const mats = Array.isArray(grid.material) ? grid.material : [grid.material];
    for (const m of mats) {
      m.transparent = true;
      m.opacity = 0.22;
      m.depthWrite = false;
    }
    grid.position.set(mm(R.width / 2), Y - 0.0005, mm(R.depth / 2));
    group.add(own(grid));
  }

  return group;
}
