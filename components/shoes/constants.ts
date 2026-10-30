export const WOOD_COLOR = "#4a2a17";
export const WOOD_SPECULAR = 0.15;
export const WOOD_ROUGHNESS = 0.8;
export const WALL_COLOR = "#b3aba0";
export const WALL_Z = -0.02;

export const COLUMNS = 3;
export const ROWS = 4;
export const COLUMN_PITCH = 0.5;
export const COLUMN_STAGGER = [0, 0.55, 0.2, 0.75];
export const SHELF_STEP = 0.46;
export const FIRST_SHELF_Y = 0.14;
export const SHELF_DEPTH = 0.26;
export const SHELF_THICKNESS = 0.04;
export const CASE_PANEL = 0.025;
export const CASE_BACK = 0.01;
export const CASE_DEPTH = CASE_BACK + SHELF_DEPTH + 0.02;
export const CASE_BASE = 0.06;
export const CASE_HEADROOM = 0.3;
export const SHELF_LENGTH = COLUMN_PITCH - CASE_PANEL;
export const SIGN_ABOVE_TOP_SHELF = 0.48;
export const SIGN_DEPTH = 0.12;
export const SIGN_TOP_GAP = 0.32;
export const WALL_TOP_MARGIN = 0.66;

export const VIEW_ANGLE_DEG = 10;
export const VIEW_HEIGHT = 1.7;
export const PULL_BACK = 1.35;
export const CAMERA_RAISE = 0.45;

export const SCROLL_EASE = 9;
export const WHEEL_SPEED = 0.0018;
export const FLICK_TIME = 0.3;

export const caseWidth = () => COLUMNS * COLUMN_PITCH + CASE_PANEL;

export const caseTop = () => topShelfY() + SHELF_THICKNESS / 2 + CASE_HEADROOM;

export const topShelfY = () => FIRST_SHELF_Y + (ROWS - 1 + Math.max(...COLUMN_STAGGER)) * SHELF_STEP;
export const wallTop = () => topShelfY() + WALL_TOP_MARGIN;
