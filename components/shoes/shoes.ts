export type ShoeModel = {
  file: string;
  fileHd: string;
  length: number;
  toe: "+x" | "-x" | "+z" | "-z";
};

export type ShoeConfig = {
  id: string;
  name: string;
  price: string;
  length: number;
  right?: ShoeModel;
  left?: ShoeModel;
  soldOut?: string[];
};

export const SHOES: ShoeConfig[] = [
  {
    id: "two-tone-penny-loafer",
    name: "Two-Tone Penny Loafer",
    price: "₦95,000",
    length: 0.29,
    right: { file: "/shoes/loafer.glb", fileHd: "/shoes/loafer-hd.glb", length: 1.119, toe: "+x" },
  },
  {
    id: "chunky-derby",
    name: "Chunky Derby",
    price: "₦110,000",
    length: 0.3,
    right: { file: "/shoes/derby.glb", fileHd: "/shoes/derby-hd.glb", length: 1.105, toe: "+x" },
  },
  {
    id: "samba-og",
    name: "Samba OG",
    price: "₦120,000",
    length: 0.29,
    right: { file: "/shoes/samba-right.glb", fileHd: "/shoes/samba-right-hd.glb", length: 1.15, toe: "+x" },
    left: { file: "/shoes/samba-left.glb", fileHd: "/shoes/samba-left-hd.glb", length: 1.154, toe: "-x" },
  },
  {
    id: "air-jordan-1-mid",
    name: "Air Jordan 1 Mid",
    price: "₦150,000",
    length: 0.3,
    right: { file: "/shoes/jordan-right.glb", fileHd: "/shoes/jordan-right-hd.glb", length: 1.058, toe: "+x" },
    left: { file: "/shoes/jordan-left.glb", fileHd: "/shoes/jordan-left-hd.glb", length: 1.059, toe: "-x" },
  },
  {
    id: "quad-chelsea-boot",
    name: "Quad Chelsea Boot",
    price: "₦140,000",
    length: 0.3,
    right: { file: "/shoes/chelsea.glb", fileHd: "/shoes/chelsea-hd.glb", length: 0.943, toe: "+x" },
  },
  {
    id: "air-jordan-4-orchid",
    name: "Air Jordan 4 Orchid",
    price: "₦165,000",
    length: 0.3,
    right: { file: "/shoes/jordan-4.glb", fileHd: "/shoes/jordan-4-hd.glb", length: 1.08, toe: "+z" },
  },
];
