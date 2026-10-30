"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { WATCHES } from "../accessories/watches";
import { BACKGROUND } from "../rack/constants";
import { preloadScene, shelfFiles } from "../rack/preloadScene";
import RackLoading from "../rack/RackLoading";
import { HOME_SHOE, PLANT_IMAGE, SIDE_SHIRTS } from "./constants";

const WardrobeScene = dynamic(() => import("./WardrobeScene"), {
  ssr: false,
  loading: () => (
    <main className="relative h-dvh w-full" style={{ background: BACKGROUND }}>
      <RackLoading />
    </main>
  ),
});

export default function HomeClient({ fallback }: { fallback: ReactNode }) {
  preloadScene({
    files: shelfFiles([HOME_SHOE]),
    images: [...SIDE_SHIRTS.map((s) => s.side!), ...WATCHES.map((w) => w.image), PLANT_IMAGE],
  });
  return <WardrobeScene fallback={fallback} />;
}
