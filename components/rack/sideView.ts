// Side views: the photo (or turn flipbook) a shirt shows when it turns away from the center.
import { MathUtils, type BufferAttribute, type Mesh, type MeshStandardMaterial, type Texture } from "three";
import {
  SHIRT_HEIGHT,
  SHIRT_WIDTH,
  SIDE_VIEW_CUT_AT,
  SIDE_VIEW_FADE,
  SIDE_VIEW_HARD_CUT,
  TURN_COLS,
  TURN_CUT_DEG,
  TURN_ROWS,
} from "./constants";
import type { TurnSheet } from "./shirts";

export const SIDE_VIEW_ROWS = 16; // plane rows, so the photo can bend with the cloth
const SIDE_VIEW_HEM_GAIN = 1.1; // follows the simulated hem line one to one
const SIDE_VIEW_BEND = 0.5; // bend curve exponent: near 1 lets the fabric swing from high up, like the front

/** What one garment shows from the side: still photos, or a turn flipbook. */
export type SideViewAssets = {
  material: MeshStandardMaterial;
  photo: { right: Texture; left: Texture | null } | null;
  turn: { sheets: { right: TurnSheet; left: TurnSheet }; right: Texture; left: Texture } | null;
};

/**
 * Updates a garment's side view for its distance `d` from the center and its turn `rotY`, and
 * returns how much of the 3D front should still show (1 = all of it).
 */
export function updateSideView(
  mesh: Mesh,
  assets: SideViewAssets,
  d: number,
  rotY: number,
  hemTip: { x: number; z: number },
) {
  const material = mesh.material as MeshStandardMaterial;
  let amount: number;
  let front: number;
  if (assets.turn) {
    // Real turning frames: show the one nearest the shirt's current angle. Every frame is opaque
    // and replaces the last outright, so the turn never blends or flashes.
    const sheet = d < 0 ? assets.turn.sheets.left : assets.turn.sheets.right;
    const map = d < 0 ? assets.turn.left : assets.turn.right;
    const degrees = MathUtils.radToDeg(Math.abs(rotY));
    amount = degrees >= TURN_CUT_DEG ? 1 : 0;
    front = 1 - amount;
    let frame = 0;
    for (let k = 1; k < sheet.angles.length; k++) {
      if (Math.abs(sheet.angles[k] - degrees) < Math.abs(sheet.angles[frame] - degrees)) frame = k;
    }
    map.offset.set((frame % TURN_COLS) / TURN_COLS, 1 - (Math.floor(frame / TURN_COLS) + 1) / TURN_ROWS);
    if (material.map !== map) material.map = map;
  } else if (SIDE_VIEW_HARD_CUT) {
    // One-frame swap at the fastest part of the turn: nothing is ever see-through, so nothing can
    // flash or ghost through.
    amount = Math.abs(d) >= SIDE_VIEW_CUT_AT ? 1 : 0;
    front = 1 - amount;
  } else {
    // Overlapped, not even: the side photo is nearly solid before the front fades much, so the
    // light background never shows through mid-swap.
    const [start, end] = SIDE_VIEW_FADE;
    const span = end - start;
    amount = MathUtils.smoothstep(Math.abs(d), start, start + span * 0.6);
    front = 1 - MathUtils.smoothstep(Math.abs(d), start + span * 0.4, end);
  }

  material.opacity = amount;
  mesh.visible = amount > 0.001;
  mesh.scale.x = d < 0 ? -1 : 1; // the photo faces left; mirror it on the left side
  // Asymmetric garments have their own photo for the left (e.g. a D-ring on one side only).
  if (assets.photo?.left) {
    const map = d < 0 ? assets.photo.left : assets.photo.right;
    if (material.map !== map) material.map = map;
  }
  if (mesh.visible) bendSideView(mesh, hemTip, rotY, mesh.scale.x);
  return front;
}

/**
 * Bends a side-view photo with the cloth sim: the shirt keeps simulating while its side photo
 * shows, so the photo is sheared by the simulated hem's sideways motion, pinned at the shoulders
 * and growing toward the hem. All the sway still comes from the solver.
 */
function bendSideView(mesh: Mesh, hemTip: { x: number; z: number }, rotY: number, mirror: number) {
  // Hem motion in the slot's frame (the side photo isn't turned with the hanger body).
  const sideways = (hemTip.x * Math.cos(rotY) + hemTip.z * Math.sin(rotY)) * SIDE_VIEW_HEM_GAIN * mirror;
  const position = mesh.geometry.getAttribute("position") as BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const depth = MathUtils.clamp((SHIRT_HEIGHT / 2 - position.getY(i)) / SHIRT_HEIGHT, 0, 1);
    const base = (i % 2 === 0 ? -1 : 1) * (SHIRT_WIDTH / 2);
    position.setX(i, base + sideways * depth ** SIDE_VIEW_BEND);
  }
  position.needsUpdate = true;
}
