// The shoe wall: floating shelves fixed straight to a wall, in four columns, each column
// staggered to its own height so the boards step diagonally across the wall, like a shop's sneaker
// wall. Metres; the floor is y = 0, the wall is z = 0.

export const WOOD_COLOR = "#4a2a17"; // deep wooden brown, a shade darker than the hangers
// How strongly the wood reflects (the studio sky and the key light; the lighting itself is the
// rack's). Plain wood reflects much less than the default, which makes the shelf tops look grey.
export const WOOD_SPECULAR = 0.15;
export const WOOD_ROUGHNESS = 0.8; // matte, like oiled wood: shinier, the tops mirror the bright studio light
export const WALL_COLOR = "#b3aba0"; // muted warm taupe: not too bright, still light enough for the brown shelves to stand out

export const COLUMNS = 3;
export const ROWS = 4; // shelves per column
export const COLUMN_PITCH = 0.45; // between column centres: a little wider than a shelf, so columns have a gap
// Each column's height offset, as a share of SHELF_STEP: uneven, so the steps don't look machined.
export const COLUMN_STAGGER = [0, 0.55, 0.2, 0.75];
export const SHELF_STEP = 0.46; // height between shelves in one column
export const FIRST_SHELF_Y = 0.14;
export const SHELF_LENGTH = 0.42;
export const SHELF_LENGTH_VARIATION = 0.04; // give or take, per shelf
export const SHELF_NUDGE = 0.025; // and a little left or right, per shelf
export const SHELF_DEPTH = 0.26;
export const SHELF_THICKNESS = 0.04;
// The Rick's Closet sign hangs above the top shelf, clear of the tallest boots on it; the wall shows
// a little above the sign at the top of the scroll.
export const SIGN_ABOVE_TOP_SHELF = 0.48; // sign centre above the top shelf
export const SIGN_DEPTH = 0.12; // in front of the wall
// When the whole wall fits on screen (phones), it's centred with room above: the sign rises to hang
// this far below the top of the view instead.
export const SIGN_TOP_GAP = 0.32;
export const WALL_TOP_MARGIN = 0.66; // wall showing above the top shelf at the top of the scroll

// Camera: standing to the right of the wall and looking across it, at this angle from straight on.
export const VIEW_ANGLE_DEG = 10; // just off straight on, so the wall nearly faces you
// How much fits: the wall's width on a phone; on wider screens, this much of its height.
export const VIEW_HEIGHT = 1.7;
export const PULL_BACK = 1.35; // wider screens: this much further away than VIEW_HEIGHT needs, so the wall sits back
export const CAMERA_RAISE = 0.45; // the eye sits this far above what it shows: you look down onto the shelves, not under them

// Scrolling: drag, wheel or keys move the camera up and down the wall, easing to a stop.
export const SCROLL_EASE = 9; // 1/s: how quickly the camera catches up with the target
export const WHEEL_SPEED = 0.0018; // metres per wheel delta unit
export const FLICK_TIME = 0.3; // seconds of release velocity carried on after a drag

/** Width of the shelving, end to end. */
export const shelvesWidth = () =>
  (COLUMNS - 1) * COLUMN_PITCH + SHELF_LENGTH + 2 * SHELF_LENGTH_VARIATION;

/** Height of the top shelf. */
export const topShelfY = () => FIRST_SHELF_Y + (ROWS - 1 + Math.max(...COLUMN_STAGGER)) * SHELF_STEP;
/** The top shelf plus a margin (room for the sign): where scrolling up stops. */
export const wallTop = () => topShelfY() + WALL_TOP_MARGIN;
