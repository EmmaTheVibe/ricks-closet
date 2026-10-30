import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import AccessoriesClient from "@/components/accessories/AccessoriesClient";
import { ARM } from "@/components/accessories/watches";
import { BACKGROUND } from "@/components/rack/constants";

export const metadata: Metadata = {
  title: "Accessories · Rick’s Closet",
  description: "Shop watches and accessories at Rick’s Closet.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: BACKGROUND,
};

export default function AccessoriesPage() {
  preload(ARM.image, { as: "image" });
  return (
    <main className="h-dvh w-full" style={{ background: BACKGROUND }}>
      <AccessoriesClient />
    </main>
  );
}
