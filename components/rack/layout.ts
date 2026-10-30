import { MathUtils } from "three";
import {
  CENTER_GAP,
  CENTER_GAP_NARROW,
  NARROW_ASPECT,
  SHIRT_SPACING,
  SHIRT_SPACING_NARROW,
  PANTS_ROTATION_DEG,
  SIDE_ROTATION_DEG,
} from "./constants";

const SIDE_ROTATION = MathUtils.degToRad(SIDE_ROTATION_DEG);
const PANTS_ROTATION = MathUtils.degToRad(PANTS_ROTATION_DEG);

export type RackLayout = { spacing: number; gap: number };

const WIDE: RackLayout = { spacing: SHIRT_SPACING, gap: CENTER_GAP };
const NARROW: RackLayout = { spacing: SHIRT_SPACING_NARROW, gap: CENTER_GAP_NARROW };

export function layoutForAspect(aspect: number) {
  return aspect < NARROW_ASPECT ? NARROW : WIDE;
}

export function centerSlotRate(layout: RackLayout) {
  return layout.spacing + (layout.gap * Math.PI) / 2;
}

export function wrapDistance(d: number, count: number) {
  return d - count * Math.round(d / count);
}

function sideAmount(d: number) {
  return Math.sin(MathUtils.clamp(d, -1, 1) * (Math.PI / 2));
}

export function slotX(d: number, layout: RackLayout) {
  return d * layout.spacing + sideAmount(d) * layout.gap;
}

export function slotRotationY(d: number, pants = false) {
  return -sideAmount(d) * (pants ? PANTS_ROTATION : SIDE_ROTATION);
}
