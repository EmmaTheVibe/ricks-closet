// Garment config. To use real shirts, drop 4:5 transparent PNGs into public/shirts/ and edit this list.

export type ShirtConfig = {
  id: string;
  name: string;
  price: string;
  texture: string;
};

export const SHIRTS: ShirtConfig[] = [
  { id: "race-knit-polo", name: "Race Knit Polo", price: "₦142,500", texture: "/shirts/race-knit-polo.png" },
  { id: "bsa-pocket-shirt", name: "BSA Pocket Shirt", price: "₦102,000", texture: "/shirts/bsa-pocket-shirt.png" },
  { id: "race-car-tee", name: "Race Car Tee", price: "₦67,500", texture: "/shirts/race-car-tee.png" },
  { id: "mask-linen-shirt", name: "Tiki Linen Shirt", price: "₦132,000", texture: "/shirts/mask-linen-shirt.png" },
  { id: "line-face-shirt", name: "Faces Shirt", price: "₦111,000", texture: "/shirts/line-face-shirt.png" },
  { id: "giraffe-shirt", name: "Giraffe Shirt", price: "₦108,000", texture: "/shirts/giraffe-shirt.png" },
  { id: "utility-camp-shirt", name: "Utility Camp Shirt", price: "₦126,000", texture: "/shirts/utility-camp-shirt.png" },
  { id: "game-football-jersey", name: "Game F. Jersey", price: "₦82,500", texture: "/shirts/game-football-jersey.png" },
  { id: "focus-polo", name: "Focus Polo", price: "₦87,000", texture: "/shirts/focus-polo.png" },
];

export const INITIAL_INDEX = Math.floor(SHIRTS.length / 2);
