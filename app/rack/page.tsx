import type { Metadata, Viewport } from "next";
import RackClient from "@/components/rack/RackClient";

export const metadata: Metadata = {
  title: "Rick’s Closet",
  description: "A swipeable clothes rack with cloth physics.",
};

// Draw edge to edge behind notches and the home indicator; the overlay pads itself by the
// safe-area insets so its controls stay clear of them.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#ebe8e3",
};

export default function RackPage() {
  return (
    <main className="h-dvh w-full bg-[#ebe8e3]">
      <RackClient />
    </main>
  );
}
