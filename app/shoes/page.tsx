import type { Metadata, Viewport } from "next";
import ShoesClient from "@/components/shoes/ShoesClient";
import { BACKGROUND } from "@/components/rack/constants";

export const metadata: Metadata = {
  title: "Shoes · Rick’s Closet",
  description: "Shop shoes at Rick’s Closet.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: BACKGROUND,
};

export default function ShoesPage() {
  return (
    <main className="h-dvh w-full" style={{ background: BACKGROUND }}>
      <ShoesClient />
    </main>
  );
}
