import type { SizedKind } from "./shirts";

type Cm = number | [number, number];

export type SizeGuide = {
  measures: string[];
  rows: { size: string; uk: string; us: string; eu: string; cm: Cm[] }[];
  note: string;
};

export const SIZE_GUIDES: Record<SizedKind, SizeGuide> = {
  shirt: {
    measures: ["Chest", "Length"],
    rows: [
      { size: "XS", uk: "34", us: "34", eu: "44", cm: [[86, 91], 68] },
      { size: "S", uk: "36", us: "36", eu: "46", cm: [[91, 96], 70] },
      { size: "M", uk: "38–40", us: "38–40", eu: "48–50", cm: [[96, 104], 72] },
      { size: "L", uk: "42", us: "42", eu: "52", cm: [[104, 109], 74] },
      { size: "XL", uk: "44", us: "44", eu: "54", cm: [[109, 114], 76] },
      { size: "XXL", uk: "46", us: "46", eu: "56", cm: [[114, 119], 78] },
    ],
    note: "Chest is measured around the fullest part; length from the base of the collar to the hem.",
  },
  pants: {
    measures: ["Waist", "Hip", "Inseam"],
    rows: [
      { size: "28", uk: "28", us: "28", eu: "44", cm: [71, 88, 81] },
      { size: "30", uk: "30", us: "30", eu: "46", cm: [76, 93, 81] },
      { size: "32", uk: "32", us: "32", eu: "48", cm: [81, 98, 81] },
      { size: "34", uk: "34", us: "34", eu: "50", cm: [86, 103, 81] },
      { size: "36", uk: "36", us: "36", eu: "52", cm: [91, 108, 81] },
      { size: "38", uk: "38", us: "38", eu: "54", cm: [97, 113, 81] },
    ],
    note: "Waist is measured where the trousers sit; hip around the fullest part; inseam from crotch to hem.",
  },
  shoes: {
    measures: ["Foot length"],
    rows: [
      { size: "40", uk: "6.5", us: "7.5", eu: "40", cm: [25] },
      { size: "41", uk: "7", us: "8", eu: "41", cm: [25.5] },
      { size: "42", uk: "8", us: "9", eu: "42", cm: [26.5] },
      { size: "43", uk: "9", us: "10", eu: "43", cm: [27.5] },
      { size: "44", uk: "9.5", us: "10.5", eu: "44", cm: [28] },
      { size: "45", uk: "10.5", us: "11.5", eu: "45", cm: [29] },
      { size: "46", uk: "11", us: "12", eu: "46", cm: [29.5] },
    ],
    note: "Foot length is measured standing, heel to the tip of the longest toe. Between sizes, size up.",
  },
};

export function formatMeasure(cm: Cm, unit: "cm" | "in") {
  const one = (v: number) => (unit === "cm" ? String(v) : String(Math.round((v / 2.54) * 2) / 2));
  return Array.isArray(cm) ? `${one(cm[0])}–${one(cm[1])}` : one(cm);
}
