export type WatchConfig = {
  id: string;
  name: string;
  price: string;
  image: string;
  width: number;
};

export const WATCHES: WatchConfig[] = [
  {
    id: "royal-oak-chronograph",
    name: "Audemars Piguet Royal Oak Selfwinding Chronograph 41 mm, Pink Gold",
    price: "₦45,000,000",
    image: "/watches/audemars-top.webp",
    width: 0.047,
  },
  {
    id: "datejust-36",
    name: "Rolex Datejust 36, Oystersteel and White Gold, Mint Green Dial",
    price: "₦18,000,000",
    image: "/watches/datejust-top.webp",
    width: 0.04,
  },
  {
    id: "santos-de-cartier",
    name: "Cartier Santos de Cartier Large, Steel, Blue Gradient Dial",
    price: "₦14,500,000",
    image: "/watches/santos-top.webp",
    width: 0.045,
  },
  {
    id: "carrera-calibre-16",
    name: "TAG Heuer Carrera Calibre 16 Day-Date 43 mm, Black Titanium Carbide",
    price: "₦6,500,000",
    image: "/watches/carrera-top.webp",
    width: 0.047,
  },
  {
    id: "nautilus-5711",
    name: "Patek Philippe Nautilus 5711/1A, Blue Dial",
    price: "₦120,000,000",
    image: "/watches/nautilus-top.webp",
    width: 0.043,
  },
  {
    id: "navitimer-b01",
    name: "Breitling Navitimer B01 Chronograph 41, 18k Red Gold",
    price: "₦55,000,000",
    image: "/watches/navitimer-top.webp",
    width: 0.047,
  },
  {
    id: "big-bang-integral-jewellery",
    name: "Hublot Big Bang Integral 42 mm, Yellow Gold Jewellery",
    price: "₦250,000,000",
    image: "/watches/hublot-top.webp",
    width: 0.048,
  },
  {
    id: "metiers-dart-dragon-phoenix",
    name: "Vacheron Constantin Métiers d’Art Tourbillon, Dragon and Phoenix, Pink Gold",
    price: "₦400,000,000",
    image: "/watches/vacheron-top.webp",
    width: 0.044,
  },
];

export const ARM = {
  image: "/watches/arm.webp",
  width: 1200,
  height: 896,
  wrist: { x: 570, y: 452 },
  wristWidth: 201,
  wristMetres: 0.058,
  crop: { x: 390, y: 319, width: 360, height: 270 },
};
