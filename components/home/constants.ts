import { WATCHES } from "../accessories/watches";
import { SHIRTS } from "../rack/shirts";
import { SHOES } from "../shoes/shoes";

export const WARDROBE_WIDTH = 1.5;
export const WARDROBE_HEIGHT = 2.2;
export const WARDROBE_DEPTH = 0.6;
export const PANEL = 0.025;
export const PLINTH = 0.08;
export const CORNICE = 0.04;
export const INNER_BOTTOM = PLINTH + PANEL;
export const INNER_TOP = WARDROBE_HEIGHT - PANEL;
export const INNER_HALF_WIDTH = WARDROBE_WIDTH / 2 - PANEL;

export const OUTER_WOOD = "#4a2a17";
export const INNER_WOOD = "#8b5e3c";
export const BRASS = "#b08d57";

export const WALL_Z = -WARDROBE_DEPTH - 0.02;
export const PLASTER = "#e8e1d6";
export const SKIRTING_COLOR = "#ddd3c4";
export const SKIRTING_HEIGHT = 0.1;
export const SKIRTING_DEPTH = 0.015;
export const FLOOR_WOOD = "#86603f";
export const BOARD_WIDTH = 0.14;
export const WALL_SHADOW_OPACITY = 0.18;

export const PLANT_IMAGE = "/home/plant.webp";
export const PLANT_HEIGHT = 1.3;
export const PLANT_EDGE = -(WARDROBE_WIDTH / 2 + 0.3);
export const PLANT_Z = WALL_Z + 0.25;
export const RING_LIGHT_X = WARDROBE_WIDTH / 2 + 0.19 + 0.65 * 1.5 + 0.13;
export const RING_LIGHT_Z = WALL_Z + 0.42;
export const RING_LIGHT_TURN_DEG = -25;

export const DOOR_THICKNESS = 0.022;
export const DOOR_OPEN_DEG = 105;
export const BRAND_COLOR = "#c9a46a";
export const BRAND_WIDTH = 0.5;
export const BRAND_ANGLE_DEG = 30;
export const BRAND_RAISE = 0.15;

export const CLOSET_RAIL_Y = 2.02;
export const CLOSET_RAIL_Z = -WARDROBE_DEPTH / 2;
export const HANG_SPACING = 0.13;
export const HANG_LAYER = 0.004;

export const STEP_WIDTH = 0.5;
export const STEP_TOP = 0.68;
export const SHOE_ID = "air-jordan-1-mid";
export const HOME_SHOE = SHOES.find((s) => s.id === SHOE_ID) ?? SHOES[0];
export const SIDE_SHIRTS = SHIRTS.filter((s) => s.side && (s.kind ?? "shirt") === "shirt");
const homeCopy = (src: string) => `/home${src}`;
export const HOME_SIDES = SIDE_SHIRTS.map((s) => homeCopy(s.side!));
export const HOME_WATCHES = WATCHES.map((w) => homeCopy(w.image));
export const SHOE_TURN_DEG = 20;
export const SHOE_Z = -0.25;

export const WATCH_TILT_DEG = 50;
export const WATCH_FRONT_Z = -0.05;

export const BAG_SIZE = { width: 0.34, height: 0.38, depth: 0.13 };
export const BAG_PAPER = "#2e2019";
export const BAG_RIBBON = "#d9c49c";
export const BAG_TISSUE = "#f3ede2";
export const BAG_X = -0.35;
export const BAG_Z = -0.27;
export const BAG_TURN_DEG = 18;

export const EYE_Y = 1.5;
export const START_FIT = { width: WARDROBE_WIDTH + 0.7, height: WARDROBE_HEIGHT * 1.5, centreY: WARDROBE_HEIGHT / 2 + 0.25 };
const LINKS_ROOM = 0.25;
export const END_FIT = {
  width: 2 * INNER_HALF_WIDTH * 1.04,
  height: (INNER_TOP - INNER_BOTTOM) * 1.04 + LINKS_ROOM,
  centreY: (INNER_TOP + INNER_BOTTOM - LINKS_ROOM) / 2,
};

export const DOORS_START = 0.9;
export const DOORS_TIME = 1.6;
export const WALK_START = 1.3;
export const WALK_TIME = 2.3;
export const INTRO_END = Math.max(DOORS_START + DOORS_TIME, WALK_START + WALK_TIME);

export const PUSH_TIME = 1.2;
export const FADE_TIME = 0.3;
export const CLOTHES_PUSH = 1.6;
export const SHOES_PUSH = 0.9;
export const SHOES_RAISE = 0.25;
export const WATCHES_PUSH = 0.7;
export const WATCHES_TIP_DEG = 15;

export const ROOMS = {
  clothes: { label: "Clothes", href: "/rack" },
  shoes: { label: "Shoes", href: "/shoes" },
  watches: { label: "Watches", href: "/accessories" },
} as const;
export type Room = keyof typeof ROOMS;
