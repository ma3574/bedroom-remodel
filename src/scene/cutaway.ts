// Hide walls between the camera and the room. Hidden walls move to layer 1, which the main
// camera skips but shadow cameras still render, so sunlight stays realistic.
import * as THREE from 'three';
import { setLayerRecursive } from '../geom';
import { WALLS, type Wall4 } from '../room/walls';
import type { State } from '../state';
import { mm } from '../units';

export const HIDDEN_LAYER = 1;

const lastState = new WeakMap<THREE.Object3D, boolean>();

function setShown(obj: THREE.Object3D, shown: boolean): void {
  if (lastState.get(obj) === shown) return;
  lastState.set(obj, shown);
  setLayerRecursive(obj, shown ? 0 : HIDDEN_LAYER);
}

/** Force re-application after a group's children change. */
export function resetCutaway(obj: THREE.Object3D): void {
  lastState.delete(obj);
}

export function updateCutaway(
  camera: THREE.Camera,
  mode: 'orbit' | 'plan' | 'walk',
  s: State,
  wallGroups: Record<Wall4, THREE.Group>,
  ceiling: THREE.Object3D,
): void {
  const p = camera.position;
  for (const id of Object.keys(WALLS) as Wall4[]) {
    const w = WALLS[id];
    let shown = true;
    if (mode === 'orbit' && s.view.autoCutaway && !s.view.showAllWalls) {
      const ox = mm(w.origin[0]);
      const oz = mm(w.origin[1]);
      const outside = (p.x - ox) * w.n[0] + (p.z - oz) * w.n[1];
      shown = outside < 0.05;
    }
    setShown(wallGroups[id], shown);
  }
  const ceilingShown = s.view.showCeiling && mode !== 'plan' && p.y < mm(2460);
  setShown(ceiling, ceilingShown);
}
