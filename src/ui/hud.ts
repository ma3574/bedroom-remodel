import type { FitResult } from '../lib/fit';
import type { WardrobeDims } from '../layout';

const $ = (id: string) => document.getElementById(id)!;

export function setHudView(text: string): void {
  $('hud-view').textContent = text;
}

export function setHudFit(fit: FitResult, d: WardrobeDims): void {
  const badge = $('hud-fit');
  badge.className = `badge ${fit.level}`;
  badge.textContent = fit.level === 'ok' ? '✓' : fit.level === 'warn' ? '!' : '✕';
  $('hud-fit-text').textContent =
    `${fit.message} · top filler ${Math.round(d.topFiller)} mm · doors ${Math.round(d.doorBottom)}–${Math.round(d.doorTop)} mm · ${d.frameArticle} + ${d.doorArticle}`;
}

export function setHudHint(text: string): void {
  const el = $('hud-hint');
  el.textContent = text;
  el.style.display = text ? '' : 'none';
}

let toastTimer = 0;
export function toast(text: string): void {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2200);
}
