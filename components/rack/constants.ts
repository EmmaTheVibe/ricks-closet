// All tunable values for the rack. World units are roughly metres.

// Grid
export const GRID_COLS = 20;
export const GRID_ROWS = 25;
export const GRID_COLS_MOBILE = 14;
export const GRID_ROWS_MOBILE = 18;
export const SUBSTEPS_MAX = 4;
export const ITERATIONS = 6;
export const DT = 1 / 120;
export const WARMUP_STEPS = 200;
export const SHEAR_STIFFNESS = 0.5;
export const GHOST_STIFFNESS = 0.05; // links lying entirely outside the shirt silhouette
export const PIN_SPAN = 0.6; // fraction of columns pinned to the hanger (shoulders + collar + yoke)
export const TETHER_SLACK = 1.02; // max stretch from the nearest pin, as a fraction of rest distance

// Forces (one fabric shared by every shirt)
export const GRAVITY = 9.8;
export const BEND_STIFFNESS = 0.4; // resistance to folding: low = drapey, high = stiff
export const DAMPING = 0.978; // swing velocity kept per step, measured in the hanger's frame
export const HEM_WEIGHT = 1.6; // gravity multiplier on the hem rows
export const HEM_ROWS = 2; // lowest opaque rows per column that get HEM_WEIGHT
export const CLOTH_INERTIA = 0.25; // share of the hanger's motion the cloth resists (1 = fully physical, 0 = rigid)
export const SHAPE_STIFFNESS = 0.0008; // per-step pull back toward the rest shape, so folds and twists don't linger
export const RELAX_TIME = 0.6; // seconds for a shirt leaving the sim to ease back to rest
export const WIND_STRENGTH = 0.2; // m/s² of idle breeze at the hem, fading to nothing at the hanger

// Interaction
export const GRAB_RADIUS = 0.12; // cloth within this distance of the grab point follows the pointer
export const GRAB_MAX_REACH = 0.25; // furthest the grabbed point can be pulled from where it was grabbed
export const GRAB_STIFFNESS = 0.2; // per-step pull of grabbed cloth toward the pointer
export const GRAB_LIFT = 0.05; // grabbed cloth is lifted this far toward the camera
export const PUSH_RADIUS = 0.1; // hover push radius
export const PUSH_STRENGTH = 6; // m/s² pushing cloth back under the pointer
export const PUSH_DRAG = 8; // 1/s: how much fast pointer movement drags the cloth along
export const POINTER_MAX_SPEED = 2; // m/s cap on pointer speed fed to the cloth

// Rack
export const RACK_MAX_SPEED = 3; // shirts per second
export const RACK_MAX_ACCEL = 8; // shirts per second²
export const RACK_SETTLE_RATE = 6; // 1/s: how quickly the final approach closes the remaining gap
export const MOMENTUM_TIME = 0.25; // seconds of release velocity projected before snapping
export const MAX_FLICK = 4; // max shirts travelled by one flick
export const SIDE_ROTATION_DEG = 70;
export const PANTS_ROTATION_DEG = 80; // same as shirts, so the rack hangs parallel; lower it to show more of the trousers
export const SIDE_VIEW_FADE: [number, number] = [0.35, 0.85]; // slots from center where the side-view photo fades in
export const SIDE_VIEW_HARD_CUT = true; // swap front and side photo in one frame (nothing see-through) instead of crossfading
export const SIDE_VIEW_CUT_AT = 0.6; // slots from center where the hard cut happens
export const SHIRT_SPACING = 0.35;
export const CENTER_GAP = 0.35; // extra room either side of the center shirt
export const NARROW_ASPECT = 0.9; // screens narrower than this (width / height) use the tighter layout
export const SHIRT_SPACING_NARROW = 0.2;
export const CENTER_GAP_NARROW = 0.36; // spacing + gap must stay ≳ 0.55 so turned neighbours clear the center shirt
export const CLICK_SLOP_PX = 6;
export const SIM_RANGE = 1.5; // shirts within this many slots of center get cloth physics
export const SIM_HYSTERESIS = 0.2; // extra range before a simulated shirt is frozen again
export const MAX_SIMULATED = 3;

// Scene
export const SHIRT_WIDTH = 0.8;
export const SHIRT_HEIGHT = 1.0; // 4:5, matches the 1024×1280 textures
export const HANGER_DROP = 0.08; // rail centre to top edge of the shirt texture
export const SHIRT_THICKNESS = 0.04; // max gap between front and back panels (shoulders); tapers toward the hem
export const EDGE_ROUNDING = 0.07; // distance in from the outline over which the panels round off to meet
export const WEAVE_REPEAT = 24; // knit texture tiles across the shirt width
export const WEAVE_BUMP = 0.6;
export const FABRIC_SHEEN = 0.12; // soft grazing-angle glow of fabric; high values grey out dark shirts
export const FABRIC_SPECULAR = 0.25; // environment reflection on the fabric (1 = glossy plastic)
export const ENV_INTENSITY = 0.6;
export const KEY_LIGHT_INTENSITY = 1.4;
export const KEY_LIGHT_COLOR = "#fff2e2"; // slightly warm, balancing the cool studio environment
export const FLOOR_SHADOW_SIZE: [number, number] = [0.85, 0.3]; // oval under each shirt: across, front-to-back
export const FLOOR_SHADOW_OPACITY = 0.28;
export const HANGER_WOOD_COLOR = "#a0683a"; // wooden hanger finish (the logo's hanger)
export const HANGER_BAR_DROP = 0.18; // rail centre to the hanger's bottom bar; cloth above it is pinned
export const RAIL_Y = 1.3;
export const SIGN_SIZE: [number, number, number] = [0.48, 0.14, 0.003]; // swing tag: width, height, thickness
export const SIGN_Y = 1.57; // tag centre: well above the hooks, just inside the top of the view
export const SIGN_TILT_DEG = -1.5; // hung by hand, not quite level
export const SIGN_PAPER = "#c8a679"; // kraft card
export const SIGN_INK = "#2a2018";
export const RAIL_LENGTH = 8;
export const RAIL_RADIUS = 0.012;
export const CAMERA_FOV = 35;
export const CAMERA_POSITION: [number, number, number] = [0, 1.0, 3.2];
export const CAMERA_TARGET: [number, number, number] = [0, 0.72, 0];
export const BACKGROUND = "#ebe8e3";
