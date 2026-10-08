// Bedside tables: a generic fluted box, or the rounded reeded oak design from the supplied photos
// (reference/bedside-reeded-*.png). Optional table lamps.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config';
import { boxMM, roundedBoxMM } from '../geom';
import { bedsideRects } from '../layout';
import { reededRoundedRect, reededStrip, type Pt } from '../lib/reeds';
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

/**
 * Vertical prism from a plan outline (x across, z towards the front, mm), smooth-shaded.
 * `verticalGrain` swaps the side-wall UVs so wood grain runs up the reeds.
 */
function prism(outline: Pt[], y0: number, y1: number, mat: THREE.Material, verticalGrain: boolean): THREE.Mesh {
  // Shape y = −z so that after rotateX(−90°) the plan maps onto world (x, z) and extrusion goes up.
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(mm(x), -mm(z))));
  let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shape, { depth: mm(y1 - y0), bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, mm(y0), 0);
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  g.computeVertexNormals();
  // UVs are in metres; scale up so the grain reads at furniture scale, and turn it vertical if asked.
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i) * 2.5;
    const v = uv.getY(i) * 2.5;
    if (verticalGrain) uv.setXY(i, v, u);
    else uv.setXY(i, u, v);
  }
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const shadowGap = new THREE.MeshStandardMaterial({ color: '#2B2018', roughness: 1 });

/** Rounded reeded design: reeded carcass on a base slab with four round legs, two reeded drawers, oak bar handles. */
function reededTable(w: number, d: number, h: number, mat: THREE.Material, handleMat: THREE.Material): THREE.Group {
  const R = CONFIG.reededTable;
  const g = new THREE.Group();
  const legTop = R.legHeight;
  const baseTop = legTop + R.baseThickness;
  const topBottom = h - R.topThickness;
  const r = Math.min(R.cornerRadius, d / 4, w / 4);
  const step = R.reedPitch / 8;

  // Top and base slabs: plain rounded rectangles.
  g.add(prism(reededRoundedRect({ x0: 0, x1: w, y0: 0, y1: d, r: r + 8, pitch: 1, depth: 0, step: 6 }), topBottom, h, mat, false));
  g.add(prism(reededRoundedRect({ x0: 4, x1: w - 4, y0: 0, y1: d - 4, r: r + 4, pitch: 1, depth: 0, step: 6 }), legTop, baseTop, mat, false));

  // Reeded carcass with the straight front recessed for the drawers.
  const cx0 = 10;
  const cx1 = w - 10;
  const cz1 = d - 10 - R.reedDepth;
  const drawerT = 18;
  g.add(
    prism(
      reededRoundedRect({ x0: cx0, x1: cx1, y0: 0, y1: cz1, r, pitch: R.reedPitch, depth: R.reedDepth, step, frontRecess: drawerT + 2 }),
      baseTop,
      topBottom,
      mat,
      true,
    ),
  );

  // Two reeded drawer fronts filling the flat front between the rounded corners, with dark shadow gaps.
  const dx0 = cx0 + r + 3;
  const dx1 = cx1 - r - 3;
  g.add(boxMM([cx0 + r - 1, baseTop, cz1 - drawerT - 2], [cx1 - r + 1, topBottom, cz1 - drawerT - 1], shadowGap));
  const zone0 = baseTop + 6;
  const zone1 = topBottom - 6;
  const dh = (zone1 - zone0 - R.drawerGap) / 2;
  const H = R.handle;
  for (let i = 0; i < 2; i++) {
    const y0 = zone0 + i * (dh + R.drawerGap);
    g.add(prism(reededStrip(dx0, dx1, cz1 - drawerT, cz1, R.reedPitch, R.reedDepth, step), y0, y0 + dh, mat, true));
    // Oak bar handle on two short posts, centred on the drawer.
    const hy = y0 + dh / 2;
    const face = cz1 + R.reedDepth;
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(mm(H.diameter / 2), mm(H.length - H.diameter), 6, 16), handleMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(mm(w / 2), mm(hy), mm(face + H.standoff));
    g.add(bar);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(mm(6), mm(6), mm(H.standoff), 12), handleMat);
      post.rotation.x = Math.PI / 2;
      post.position.set(mm(w / 2 + (sx * H.posts) / 2), mm(hy), mm(face + H.standoff / 2));
      g.add(post);
    }
  }

  // Round legs.
  for (const x of [R.legInset.x, w - R.legInset.x]) {
    for (const z of [R.legInset.z, d - R.legInset.z]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(mm(R.legDiameter / 2), mm(R.legDiameter / 2 - 2), mm(legTop), 24), mat);
      leg.position.set(mm(x), mm(legTop / 2), mm(z));
      g.add(leg);
    }
  }
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
  const handleMat = s.bedside.finish === 'oak' ? M.handleOak : mat;
  for (const r of bedsideRects(s)) {
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;
    const t = s.bedside.style === 'reeded-oak' ? reededTable(w, d, s.bedside.h, mat, handleMat) : table(w, d, s.bedside.h, mat);
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
