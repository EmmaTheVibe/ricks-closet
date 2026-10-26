// Shoe config, in display order: the first shoe gets the top shelf, and so on down the wall.
//
// Each design has a 3D model of the right foot, the left foot, or both. A missing foot is the
// mirror of the other, which is fine unless the shoe has lettering (it would read backwards).
// Models come from an image-to-3D tool, then are shrunk with glTF-Transform:
//   npx @gltf-transform/cli optimize assets/shoes/<name>.glb public/shoes/<name>.glb \
//     --compress meshopt --texture-compress webp --texture-size 1024 --simplify-ratio 0.06
// (`fileHd`: --texture-size 2048 --simplify-ratio 0.08). `file` is for the shelf, `fileHd` for
// close-ups. Originals stay in assets/shoes/, outside public/.

export type ShoeModel = {
  file: string;
  fileHd: string;
  /** The model's length as exported (model units, heel to toe), to scale it to the shoe's `length`. */
  length: number;
  /**
   * Which way the toe points in the model (it follows the image it was made from): "+x"/"-x" from a
   * side profile, "+z" from a multi-view model whose main image was the front.
   */
  toe: "+x" | "-x" | "+z" | "-z";
};

export type ShoeConfig = {
  id: string;
  name: string;
  price: string;
  length: number; // metres, heel to toe
  right?: ShoeModel;
  left?: ShoeModel;
  soldOut?: string[]; // EU sizes out of stock, e.g. ["40", "46"]: shown crossed out
};

export const SHOES: ShoeConfig[] = [
  {
    id: "two-tone-penny-loafer",
    name: "Two-Tone Penny Loafer",
    price: "₦95,000", // placeholder
    length: 0.29,
    right: { file: "/shoes/loafer.glb", fileHd: "/shoes/loafer-hd.glb", length: 1.119, toe: "+x" },
  },
  {
    id: "chunky-derby",
    name: "Chunky Derby",
    price: "₦110,000", // placeholder
    length: 0.3,
    right: { file: "/shoes/derby.glb", fileHd: "/shoes/derby-hd.glb", length: 1.105, toe: "+x" },
  },
  {
    id: "samba-og",
    name: "Samba OG",
    price: "₦120,000", // placeholder
    length: 0.29,
    right: { file: "/shoes/samba-right.glb", fileHd: "/shoes/samba-right-hd.glb", length: 1.15, toe: "+x" },
    left: { file: "/shoes/samba-left.glb", fileHd: "/shoes/samba-left-hd.glb", length: 1.154, toe: "-x" },
  },
  {
    id: "air-jordan-1-mid",
    name: "Air Jordan 1 Mid",
    price: "₦150,000", // placeholder
    length: 0.3,
    right: { file: "/shoes/jordan-right.glb", fileHd: "/shoes/jordan-right-hd.glb", length: 1.058, toe: "+x" },
    left: { file: "/shoes/jordan-left.glb", fileHd: "/shoes/jordan-left-hd.glb", length: 1.059, toe: "-x" },
  },
  {
    id: "quad-chelsea-boot",
    name: "Quad Chelsea Boot",
    price: "₦140,000", // placeholder
    length: 0.3,
    right: { file: "/shoes/chelsea.glb", fileHd: "/shoes/chelsea-hd.glb", length: 0.943, toe: "+x" },
  },
  {
    id: "air-jordan-4-orchid",
    name: "Air Jordan 4 Orchid",
    price: "₦165,000", // placeholder
    length: 0.3,
    right: { file: "/shoes/jordan-4.glb", fileHd: "/shoes/jordan-4-hd.glb", length: 1.08, toe: "+z" },
  },
];
