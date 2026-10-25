import type { Metadata, Viewport } from "next";
import ShoesClient from "@/components/shoes/ShoesClient";
import { WALL_COLOR } from "@/components/shoes/constants";

export const metadata: Metadata = {
  title: "Shoes · Rick’s Closet",
  description: "Shop shoes at Rick’s Closet.",
};

// Same as the rack: draw edge to edge behind notches and the home indicator.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: WALL_COLOR,
};

export default function ShoesPage() {
  return (
    <main className="h-dvh w-full" style={{ background: WALL_COLOR }}>
      <ShoesClient />
    </main>
  );
}
