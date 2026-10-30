import { useEffect, useState } from "react";
import { WATCHES } from "../accessories/watches";
import { SHOES } from "../shoes/shoes";
import { SHIRTS } from "./shirts";

const STORAGE_KEY = "ricks-closet-bag";
export const MAX_QUANTITY = 9;

export type BagLine = { id: string; size: string; quantity: number; image?: string };

export type BagItemInfo = { name: string; price: string; image?: string };

export function priceValue(price: string) {
  return Number(price.replace(/[^\d.]/g, "")) || 0;
}

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
export const formatNaira = (value: number) => naira.format(value);

export function itemOf(line: BagLine): BagItemInfo | undefined {
  const shirt = SHIRTS.find((s) => s.id === line.id);
  if (shirt) return { name: shirt.name, price: shirt.price, image: line.image ?? shirt.texture };
  const shoe = SHOES.find((s) => s.id === line.id);
  if (shoe) return { name: shoe.name, price: shoe.price, image: line.image };
  const watch = WATCHES.find((w) => w.id === line.id);
  if (watch) return { name: watch.name, price: watch.price, image: watch.image };
  return undefined;
}

function load(): BagLine[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is BagLine =>
        typeof l?.id === "string" && typeof l?.size === "string" && Number.isInteger(l?.quantity) && itemOf(l) !== undefined,
    );
  } catch {
    return [];
  }
}

export function useBag() {
  const [lines, setLines] = useState<BagLine[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {}
  }, [lines]);

  const add = (id: string, size: string, image?: string) =>
    setLines((ls) => {
      const existing = ls.find((l) => l.id === id && l.size === size);
      if (!existing) return [...ls, { id, size, quantity: 1, ...(image ? { image } : {}) }];
      return ls.map((l) => (l === existing ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + 1) } : l));
    });

  const setQuantity = (line: BagLine, quantity: number) =>
    setLines((ls) =>
      quantity <= 0
        ? ls.filter((l) => !(l.id === line.id && l.size === line.size))
        : ls.map((l) => (l.id === line.id && l.size === line.size ? { ...l, quantity: Math.min(MAX_QUANTITY, quantity) } : l)),
    );

  const clear = () => setLines([]);

  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + priceValue(itemOf(l)?.price ?? "") * l.quantity, 0);

  return { lines, add, setQuantity, clear, count, subtotal };
}

export type Bag = ReturnType<typeof useBag>;
