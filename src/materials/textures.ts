// Procedural canvas textures (wood grain, fabric, rattan weave, tiles, sky, bump maps).
import * as THREE from 'three';
import { mulberry32 } from '../lib/rng';

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  return { c, ctx };
}

function rgba(hex: string, a: number): string {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
}

export function srgbTexture(c: HTMLCanvasElement, repeat?: [number, number]): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}

export function dataTexture(c: HTMLCanvasElement, repeat?: [number, number]): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}

export interface GrainOptions {
  base: string;
  dark: string;
  light: string;
  seed: number;
  w?: number;
  h?: number;
  streaks?: number;
}

/** Long-grain wood: tonal bands, wavy streaks, an occasional cathedral figure and pores. Grain runs along x. */
export function woodGrainCanvas(o: GrainOptions): HTMLCanvasElement {
  const w = o.w ?? 1024;
  const h = o.h ?? 256;
  const { c, ctx } = makeCanvas(w, h);
  const r = mulberry32(o.seed);
  ctx.fillStyle = o.base;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 5; i++) {
    const y = r() * h;
    const bh = h * (0.15 + r() * 0.35);
    const col = r() < 0.5 ? o.dark : o.light;
    const g = ctx.createLinearGradient(0, y - bh / 2, 0, y + bh / 2);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, 0.1 + r() * 0.12));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, y - bh / 2, w, bh);
  }

  const n = o.streaks ?? 140;
  for (let i = 0; i < n; i++) {
    const dark = r() < 0.65;
    ctx.strokeStyle = dark ? o.dark : o.light;
    ctx.globalAlpha = dark ? 0.12 + r() * 0.35 : 0.08 + r() * 0.22;
    ctx.lineWidth = 0.4 + r() * (dark ? 1.8 : 2.6);
    const y0 = r() * h;
    const amp = 0.5 + r() * 3;
    const f = ((0.5 + r() * 1.5) * Math.PI * 2) / w;
    const ph = r() * Math.PI * 2;
    const drift = (r() - 0.5) * h * 0.08;
    const partial = r() < 0.3;
    const xs = partial ? r() * w * 0.6 : -10;
    const xe = partial ? xs + w * (0.2 + r() * 0.5) : w + 10;
    ctx.beginPath();
    for (let x = xs; x <= xe; x += 12) {
      const y = y0 + Math.sin(x * f + ph) * amp + drift * (x / w);
      if (x === xs) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  if (r() < 0.6) {
    const cx = w * (0.3 + r() * 0.4);
    const cy = h * (0.3 + r() * 0.4);
    ctx.strokeStyle = o.dark;
    for (let k = 0; k < 6; k++) {
      ctx.globalAlpha = 0.08 + r() * 0.08;
      ctx.lineWidth = 0.8 + r();
      ctx.beginPath();
      ctx.ellipse(cx, cy, (60 + k * 28) * 2.2, 10 + k * 9, 0, Math.PI * 0.6, Math.PI * 1.4);
      ctx.stroke();
    }
  }

  ctx.fillStyle = o.dark;
  for (let i = 0; i < (w * h) / 290; i++) {
    ctx.globalAlpha = 0.08 + r() * 0.22;
    ctx.fillRect(r() * w, r() * h, 2 + r() * 6, 0.8);
  }
  ctx.globalAlpha = 1;
  return c;
}

/** Soft melange fabric: speckles plus a faint weave. Usable as colour and bump. */
export function melangeCanvas(base: string, seed: number, size = 256): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(size, size);
  const r = mulberry32(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size * 0.18; i++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(60,45,30,0.09)';
    ctx.fillRect(r() * size, r() * size, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#000';
  for (let y = 0; y < size; y += 2) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(size, y + 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return c;
}

/** Rattan weave: returns colour and alpha canvases (diagonal lattice of strands). */
export function weaveCanvases(): { color: HTMLCanvasElement; alpha: HTMLCanvasElement } {
  const size = 512;
  const color = makeCanvas(size, size);
  const alpha = makeCanvas(size, size);
  color.ctx.fillStyle = '#A57E4E';
  color.ctx.fillRect(0, 0, size, size);
  alpha.ctx.fillStyle = '#000';
  alpha.ctx.fillRect(0, 0, size, size);
  const step = 32;
  for (const dir of [1, -1]) {
    for (let i = -size; i < size * 2; i += step) {
      for (const [ctx, style] of [
        [color.ctx, dir > 0 ? '#C49A63' : '#B38A55'],
        [alpha.ctx, '#fff'],
      ] as const) {
        ctx.strokeStyle = style;
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + dir * size, size);
        ctx.stroke();
      }
    }
  }
  return { color: color.c, alpha: alpha.c };
}

/** 300×600 tiles with grout, canvas covers 1200×1200mm. */
export function tileCanvas(): HTMLCanvasElement {
  const size = 512;
  const { c, ctx } = makeCanvas(size, size);
  ctx.fillStyle = '#D9D6D0';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#B9B4AC';
  ctx.lineWidth = 2;
  const tw = size / 4;
  const th = size / 2;
  for (let row = 0; row < 2; row++) {
    for (let col = -1; col < 5; col++) {
      const x = col * tw + (row % 2 ? tw / 2 : 0);
      ctx.strokeRect(x, row * th, tw, th);
    }
  }
  return c;
}

export function carpetCanvas(): HTMLCanvasElement {
  const size = 256;
  const { c, ctx } = makeCanvas(size, size);
  const r = mulberry32(7);
  ctx.fillStyle = '#9C978E';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 20000; i++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(r() * size, r() * size, 1, 1);
  }
  return c;
}

export type SkyKind = 'day' | 'evening' | 'night';

/** Backdrop seen through the window: sky gradient over a soft distant treeline. */
export function skyCanvas(kind: SkyKind): HTMLCanvasElement {
  const w = 1024;
  const h = 512;
  const { c, ctx } = makeCanvas(w, h);
  const stops: Record<SkyKind, [string, string, string, string]> = {
    day: ['#8FB6DE', '#CFE0EE', '#F2EDE2', '#8E9A80'],
    evening: ['#5A6E9A', '#E7A77A', '#F6D2A0', '#4E5546'],
    night: ['#060A18', '#141C34', '#1E2740', '#0A0D12'],
  };
  const [top, mid, horizon, ground] = stops[kind];
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(0.45, mid);
  g.addColorStop(0.62, horizon);
  g.addColorStop(0.64, ground);
  g.addColorStop(1, ground);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Treeline silhouette
  const r = mulberry32(3);
  ctx.fillStyle = kind === 'night' ? '#05070B' : kind === 'evening' ? '#3B4237' : '#748265';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.64);
  for (let x = 0; x <= w; x += 16) ctx.lineTo(x, h * (0.6 - r() * 0.05 - Math.sin(x / 90) * 0.015));
  ctx.lineTo(w, h * 0.66);
  ctx.lineTo(0, h * 0.66);
  ctx.fill();
  if (kind === 'night') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 120; i++) ctx.fillRect(r() * w, r() * h * 0.5, 1.2, 1.2);
  }
  return c;
}

/** Bump map for the Pesaro photo: high-pass luminance so the grooves read as recessed. */
export function highPassBumpCanvas(img: CanvasImageSource & { width: number; height: number }, radius = 6, gain = 3): HTMLCanvasElement {
  const w = img.width;
  const h = img.height;
  const { c, ctx } = makeCanvas(w, h);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = 0.299 * data.data[i * 4] + 0.587 * data.data[i * 4 + 1] + 0.114 * data.data[i * 4 + 2];
  }
  const blur = boxBlur(boxBlur(lum, w, h, radius, true), w, h, radius, false);
  for (let i = 0; i < w * h; i++) {
    const v = Math.max(0, Math.min(255, 128 + (lum[i] - blur[i]) * gain));
    data.data[i * 4] = data.data[i * 4 + 1] = data.data[i * 4 + 2] = v;
    data.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

function boxBlur(src: Float32Array, w: number, h: number, r: number, horizontal: boolean): Float32Array {
  const out = new Float32Array(src.length);
  const n = horizontal ? w : h;
  const lines = horizontal ? h : w;
  for (let line = 0; line < lines; line++) {
    const idx = (i: number) => (horizontal ? line * w + i : i * w + line);
    let acc = 0;
    let count = 0;
    for (let i = 0; i <= Math.min(r, n - 1); i++) {
      acc += src[idx(i)];
      count++;
    }
    for (let i = 0; i < n; i++) {
      out[idx(i)] = acc / count;
      const add = i + r + 1;
      if (add < n) {
        acc += src[idx(add)];
        count++;
      }
      const rem = i - r;
      if (rem >= 0) {
        acc -= src[idx(rem)];
        count--;
      }
    }
  }
  return out;
}

/** Crushed-velvet mottling with fine horizontal slubs, neutral grey (multiply with the fabric colour). */
export function velvetCanvas(seed: number, size = 512): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(size, size);
  const r = mulberry32(seed);
  ctx.fillStyle = 'rgb(205,205,205)';
  ctx.fillRect(0, 0, size, size);
  // Soft blotches (draw wrapped so the tile repeats seamlessly)
  for (let i = 0; i < 140; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = 20 + r() * 110;
    const light = r() < 0.5;
    const a = 0.05 + r() * 0.12;
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
        g.addColorStop(0, light ? `rgba(255,255,255,${a})` : `rgba(70,70,70,${a})`);
        g.addColorStop(1, 'rgba(128,128,128,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
      }
    }
  }
  // Horizontal slubs
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = r() < 0.6 ? `rgba(255,255,255,${0.06 + r() * 0.14})` : `rgba(40,40,40,${0.05 + r() * 0.1})`;
    ctx.fillRect(r() * size, r() * size, 4 + r() * 26, 1);
  }
  return c;
}
