export const LEATHER_COLOR = "#161616";
export const FRAME_COLOR = "#202022";
export const SUEDE_COLOR = "#4a4a4d";
export const CUSHION_COLOR = "#66666a";
export const METAL_COLOR = "#c8c8cc";

export const COMPARTMENT = { width: 0.075, depth: 0.1 };
export const DIVIDER = 0.012;
export const FRAME_MARGIN = 0.014;
export const WALL = 0.016;
export const CHAMFER = 0.03;
export const BOX_HEIGHT = 0.085;
export const FLOOR = 0.01;
export const FRAME_HEIGHT = 0.06;
export const CUSHION_HEIGHT = 0.034;
export const CUSHION_WIDTH = COMPARTMENT.width * 0.86;
export const CUSHION_DEPTH = COMPARTMENT.depth * 0.62;
export const CUSHION_RADIUS = 0.015;
export const CUSHION_TOP = FRAME_HEIGHT + 0.001;
export const CASE_THICKNESS = 0.012;
export const LID_THICKNESS = 0.045;
export const LID_PLATE = 0.008;
export const LID_LINER = 0.003;
export const LID_OPEN_DEG = 112;

export const LAYOUTS = { wide: { cols: 4, rows: 2 } } as const;

export const SIDEBOARD = { width: 1.1, depth: 0.48, height: 0.8, back: -0.28, top: 0.03, legs: 0.16 };
export const SIDEBOARD_WALL_Z = SIDEBOARD.back - 0.02;
export const SIDEBOARD_WOOD = "#4a2a17";
export const MARBLE = "#d6cfc4";
export const BRASS = "#b08d57";

export type BoxLayout = (typeof LAYOUTS)[keyof typeof LAYOUTS];

export function boxSize({ cols, rows }: BoxLayout) {
  const inside = (n: number, slot: number) => n * slot + (n - 1) * DIVIDER + 2 * FRAME_MARGIN;
  return {
    width: inside(cols, COMPARTMENT.width) + 2 * WALL,
    depth: inside(rows, COMPARTMENT.depth) + 2 * WALL,
  };
}

export function slotCentre(layout: BoxLayout, col: number, row: number) {
  const { width, depth } = boxSize(layout);
  const x0 = -width / 2 + WALL + FRAME_MARGIN;
  const z0 = -depth / 2 + WALL + FRAME_MARGIN;
  return {
    x: x0 + col * (COMPARTMENT.width + DIVIDER) + COMPARTMENT.width / 2,
    z: z0 + row * (COMPARTMENT.depth + DIVIDER) + COMPARTMENT.depth / 2,
  };
}
