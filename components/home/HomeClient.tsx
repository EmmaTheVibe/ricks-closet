"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { BACKGROUND } from "../rack/constants";
import { preloadScene, shelfFiles } from "../rack/preloadScene";
import RackLoading from "../rack/RackLoading";
import { HOME_SHOE, HOME_SIDES, HOME_WATCHES, PLANT_IMAGE } from "./constants";

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
    images: [...HOME_SIDES, ...HOME_WATCHES, PLANT_IMAGE],
  });
  return <WardrobeScene fallback={fallback} />;
}
