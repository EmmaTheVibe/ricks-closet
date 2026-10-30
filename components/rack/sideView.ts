import { MathUtils, type BufferAttribute, type Mesh, type MeshStandardMaterial, type Texture } from "three";
import { SHIRT_HEIGHT, SHIRT_WIDTH, SIDE_VIEW_CUT_AT, SIDE_VIEW_FADE, SIDE_VIEW_HARD_CUT } from "./constants";

export const SIDE_VIEW_ROWS = 16;
const SIDE_VIEW_HEM_GAIN = 1.1;
const SIDE_VIEW_BEND = 0.5;

export type SideViewAssets = {
  material: MeshStandardMaterial;
  photo: { right: Texture; left: Texture | null };
};

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
  if (SIDE_VIEW_HARD_CUT) {
    amount = Math.abs(d) >= SIDE_VIEW_CUT_AT ? 1 : 0;
    front = 1 - amount;
  } else {
    const [start, end] = SIDE_VIEW_FADE;
    const span = end - start;
    amount = MathUtils.smoothstep(Math.abs(d), start, start + span * 0.6);
    front = 1 - MathUtils.smoothstep(Math.abs(d), start + span * 0.4, end);
  }

  material.opacity = amount;
  mesh.visible = amount > 0.001;
  mesh.scale.x = d < 0 ? -1 : 1;
  if (assets.photo.left) {
    const map = d < 0 ? assets.photo.left : assets.photo.right;
    if (material.map !== map) material.map = map;
  }
  if (mesh.visible) bendSideView(mesh, hemTip, rotY, mesh.scale.x);
  return front;
}

function bendSideView(mesh: Mesh, hemTip: { x: number; z: number }, rotY: number, mirror: number) {
  const sideways = (hemTip.x * Math.cos(rotY) + hemTip.z * Math.sin(rotY)) * SIDE_VIEW_HEM_GAIN * mirror;
  const position = mesh.geometry.getAttribute("position") as BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const depth = MathUtils.clamp((SHIRT_HEIGHT / 2 - position.getY(i)) / SHIRT_HEIGHT, 0, 1);
    const base = (i % 2 === 0 ? -1 : 1) * (SHIRT_WIDTH / 2);
    position.setX(i, base + sideways * depth ** SIDE_VIEW_BEND);
  }
  position.needsUpdate = true;
}

export function showSideViewStill(mesh: Mesh, assets: SideViewAssets, mirrored: boolean) {
  const material = mesh.material as MeshStandardMaterial;
  material.opacity = 1;
  mesh.visible = true;
  mesh.scale.x = mirrored ? -1 : 1;
  const map = mirrored && assets.photo.left ? assets.photo.left : assets.photo.right;
  if (material.map !== map) material.map = map;
  bendSideView(mesh, { x: 0, z: 0 }, 0, mesh.scale.x);
}
