// Garment config. To use real shirts, run `npm run prepare-shirt` on a cut-out image and edit this list.

export type ShirtConfig = {
  id: string;
  name: string;
  price: string;
  texture: string;
};

export const SHIRTS: ShirtConfig[] = [
  { id: "race-knit-polo", name: "Race Knit Polo", price: "₦142,500", texture: "/shirts/race-knit-polo.webp" },
  { id: "bsa-pocket-shirt", name: "BSA Pocket Shirt", price: "₦102,000", texture: "/shirts/bsa-pocket-shirt.webp" },
  { id: "race-car-tee", name: "Race Car Tee", price: "₦67,500", texture: "/shirts/race-car-tee.webp" },
  { id: "mask-linen-shirt", name: "Tiki Linen Shirt", price: "₦132,000", texture: "/shirts/mask-linen-shirt.webp" },
  { id: "line-face-shirt", name: "Faces Shirt", price: "₦111,000", texture: "/shirts/line-face-shirt.webp" },
  { id: "giraffe-shirt", name: "Giraffe Shirt", price: "₦108,000", texture: "/shirts/giraffe-shirt.webp" },
  { id: "utility-camp-shirt", name: "Utility Camp Shirt", price: "₦126,000", texture: "/shirts/utility-camp-shirt.webp" },
  { id: "game-football-jersey", name: "Game F. Jersey", price: "₦82,500", texture: "/shirts/game-football-jersey.webp" },
  { id: "focus-polo", name: "Focus Polo", price: "₦87,000", texture: "/shirts/focus-polo.webp" },
];

export const INITIAL_INDEX = Math.floor(SHIRTS.length / 2);
