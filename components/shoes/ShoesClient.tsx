"use client";

import dynamic from "next/dynamic";
import { preloadScene, shelfFiles } from "../rack/preloadScene";
import RackLoading from "../rack/RackLoading";
import { SHOES } from "./shoes";

const ShoeScene = dynamic(() => import("./ShoeScene"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full w-full">
      <RackLoading />
    </div>
  ),
});

export default function ShoesClient() {
  preloadScene({ files: shelfFiles(SHOES) });
  return <ShoeScene />;
}
