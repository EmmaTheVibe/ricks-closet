// Garment config. To use real shirts, run `npm run prepare-shirt` on a cut-out image and edit this list,
// then paint the wooden hanger into a shirt's images with scripts/paint-hanger.mjs.

/** Shirts hang from a wooden hanger by the shoulders; pants from a clip hanger by the waistband. */
export type GarmentKind = "shirt" | "pants";

/** A turn flipbook (scripts/prepare-turn.mjs): one sheet of frames, front -> side, with their angles. */
export type TurnSheet = { src: string; angles: number[] };

export type ShirtConfig = {
  id: string;
  name: string;
  price: string;
  texture: string;
  kind?: GarmentKind; // default "shirt"
  side?: string; // side-profile image (front facing left), shown when the garment is turned away
  sideLeft?: string; // optional version for the left of the rack (mirrored there), for asymmetric garments
  turn?: { right: TurnSheet; left: TurnSheet }; // real turning frames; replaces side/sideLeft
};

export const SHIRTS: ShirtConfig[] = [
  { id: "race-knit-polo", name: "Race Knit Polo", price: "₦142,500", texture: "/shirts/race-knit-polo.webp", side: "/shirts/race-knit-polo-side.webp", sideLeft: "/shirts/race-knit-polo-side-left.webp" },
  { id: "bsa-pocket-shirt", name: "BSA Pocket Shirt", price: "₦102,000", texture: "/shirts/bsa-pocket-shirt.webp", side: "/shirts/bsa-pocket-shirt-side.webp", sideLeft: "/shirts/bsa-pocket-shirt-side-left.webp" },
  { id: "race-car-tee", name: "Race Car Tee", price: "₦67,500", texture: "/shirts/race-car-tee.webp", side: "/shirts/race-car-tee-side.webp", sideLeft: "/shirts/race-car-tee-side-left.webp" },
  { id: "brown-pleated-trousers", name: "Pleated Wool Trousers", price: "₦98,000", texture: "/shirts/brown-pleated-trousers.webp", kind: "pants" },
  { id: "mask-linen-shirt", name: "Tiki Linen Shirt", price: "₦132,000", texture: "/shirts/mask-linen-shirt.webp", side: "/shirts/mask-linen-shirt-side.webp", sideLeft: "/shirts/mask-linen-shirt-side-left.webp" },
  { id: "line-face-shirt", name: "Faces Shirt", price: "₦111,000", texture: "/shirts/line-face-shirt.webp", side: "/shirts/line-face-shirt-side.webp", sideLeft: "/shirts/line-face-shirt-side-left.webp" },
  { id: "pinstripe-trousers", name: "Pinstripe Trousers", price: "₦96,000", texture: "/shirts/pinstripe-trousers.webp", kind: "pants" },
  { id: "giraffe-shirt", name: "Giraffe Shirt", price: "₦108,000", texture: "/shirts/giraffe-shirt.webp", side: "/shirts/giraffe-shirt-side.webp", sideLeft: "/shirts/giraffe-shirt-side-left.webp" },
  { id: "utility-camp-shirt", name: "Utility Camp Shirt", price: "₦126,000", texture: "/shirts/utility-camp-shirt.webp", side: "/shirts/utility-camp-shirt-side.webp", sideLeft: "/shirts/utility-camp-shirt-side-left.webp" },
  { id: "game-football-jersey", name: "Game F. Jersey", price: "₦82,500", texture: "/shirts/game-football-jersey.webp", side: "/shirts/game-football-jersey-side.webp", sideLeft: "/shirts/game-football-jersey-side-left.webp" },
  { id: "stone-sweatpants", name: "Stone Sweatpants", price: "₦78,000", texture: "/shirts/stone-sweatpants.webp", kind: "pants" },
  { id: "focus-polo", name: "Focus Polo", price: "₦87,000", texture: "/shirts/focus-polo.webp", side: "/shirts/focus-polo-side.webp", sideLeft: "/shirts/focus-polo-side-left.webp" },
];

export const INITIAL_INDEX = Math.floor((SHIRTS.length - 1) / 2);
