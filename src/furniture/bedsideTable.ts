// Generic fluted bedside tables (echoing the headboard channels) with optional table lamps.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config';
import { boxMM, roundedBoxMM } from '../geom';
import { bedsideRects } from '../layout';
import { M, finishMaterial } from '../materials/library';
import type { State } from '../state';
import { mm } from '../units';

export interface BedsideRefs {
  group: THREE.Group;
  lamps: THREE.Group;
  lampLights: THREE.PointLight[];
  lampShades: THREE.Mesh[];
}

const BT = CONFIG.bedsideTable;

/** Half-round flutes along one face. Face runs from `from` to `to` along `axis`, at offset `face` on the normal axis. */
function flutes(
  axis: 'x' | 'z',
  from: number,
  to: number,
  face: number,
  normalSign: 1 | -1,
  y0: number,
  y1: number,
  breaks: number[],
): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const pitch = BT.flutePitch;
  const n = Math.max(1, Math.floor((to - from) / pitch));
  const start = from + (to - from - n * pitch) / 2 + pitch / 2;
  const r = BT.fluteRadius;
  const spans: [number, number][] = [];
  let lo = y0;
  for (const b of [...breaks].sort((p, q) => p - q)) {
    spans.push([lo, b - 1.5]);
    lo = b + 1.5;
  }
  spans.push([lo, y1]);
  for (let i = 0; i < n; i++) {
    const t = start + i * pitch;
    for (const [a, b] of spans) {
      if (b - a < 5) continue;
      const g = new THREE.CylinderGeometry(mm(r), mm(r), mm(b - a), 12, 1, false, 0, Math.PI);
      // theta 0..π gives a half-cylinder bulging towards +x; turn it to face the normal.
      if (axis === 'x') {
        g.rotateY(normalSign > 0 ? -Math.PI / 2 : Math.PI / 2);
        g.translate(mm(t), mm((a + b) / 2), mm(face));
      } else {
        if (normalSign < 0) g.rotateY(Math.PI);
        g.translate(mm(face), mm((a + b) / 2), mm(t));
      }
      out.push(g);
    }
  }
  return out;
}

function table(w: number, d: number, h: number, mat: THREE.Material): THREE.Group {
  // Local: x across (0..w), z from the wall (0) to the front (d), y up.
  const g = new THREE.Group();
  const topT = BT.topThickness;
  const plinth = 40;
  const inset = 30;
  const bodyY0 = plinth;
  const bodyY1 = h - topT;
  const r = BT.fluteRadius;
  g.add(roundedBoxMM([0, h - topT, 0], [w, h, d], 4, mat));
  g.add(boxMM([inset, 0, inset], [w - inset, plinth, d - inset], M.walnut));
  // Body sits inside the flutes so the outer silhouette is ~ the top size.
  g.add(boxMM([r, bodyY0, 0], [w - r, bodyY1, d - r], mat));
  const drawerLine = bodyY1 - 120;
  const geos = [
    ...flutes('x', r, w - r, d - r, 1, bodyY0, bodyY1, [drawerLine]),
    ...flutes('z', 0, d - r, r, -1, bodyY0, bodyY1, []),
    ...flutes('z', 0, d - r, w - r, 1, bodyY0, bodyY1, []),
  ];
  const m = new THREE.Mesh(mergeGeometries(geos), mat);
  g.add(m);
  g.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

function lamp(): { group: THREE.Group; light: THREE.PointLight; shade: THREE.Mesh } {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0, 0],
        [60, 0],
        [72, 60],
        [70, 160],
        [40, 250],
        [12, 270],
        [12, 300],
        [0, 300],
      ].map(([x, y]) => new THREE.Vector2(mm(x), mm(y))),
      32,
    ),
    M.ceramic,
  );
  base.castShadow = true;
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(mm(130), mm(150), mm(210), 40, 1, true), M.linen.clone());
  shade.userData.ownMaterial = true;
  shade.position.y = mm(300 + 80);
  const light = new THREE.PointLight('#FFC58F', 0, 0, 2);
  light.position.y = mm(360);
  group.add(base, shade, light);
  return { group, light, shade };
}

export function buildBedsideTables(s: State): BedsideRefs {
  const group = new THREE.Group();
  group.name = 'bedside';
  const lamps = new THREE.Group();
  const lampLights: THREE.PointLight[] = [];
  const lampShades: THREE.Mesh[] = [];
  const mat = finishMaterial(s.bedside.finish);
  for (const r of bedsideRects(s)) {
    const t = table(r.x1 - r.x0, r.z1 - r.z0, s.bedside.h, mat);
    t.position.set(mm(r.x0), 0, mm(r.z0));
    group.add(t);
    const l = lamp();
    l.group.position.set(mm((r.x0 + r.x1) / 2), mm(s.bedside.h), mm(r.z0 + (r.z1 - r.z0) * 0.45));
    lamps.add(l.group);
    lampLights.push(l.light);
    lampShades.push(l.shade);
  }
  group.add(lamps);
  return { group, lamps, lampLights, lampShades };
}
