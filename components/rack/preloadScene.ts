import { preload } from "react-dom";
import type { ShoeConfig } from "../shoes/shoes";
import { ENV_MAP } from "./constants";

export const shelfFiles = (shoes: ShoeConfig[]) =>
  shoes.flatMap((s) => [s.right, s.left].flatMap((m) => (m ? [m.file] : [])));

export function preloadScene({ files = [], images = [] }: { files?: string[]; images?: string[] }) {
  for (const href of [ENV_MAP, ...files]) preload(href, { as: "fetch", crossOrigin: "anonymous", fetchPriority: "low" });
  for (const href of images) preload(href, { as: "image", crossOrigin: "anonymous", fetchPriority: "low" });
}
