"use client";

import dynamic from "next/dynamic";
import { preload } from "react-dom";
import { preloadScene } from "../rack/preloadScene";
import RackLoading from "../rack/RackLoading";
import { ARM, WATCHES } from "./watches";

const AccessoriesScene = dynamic(() => import("./AccessoriesScene"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full w-full">
      <RackLoading />
    </div>
  ),
});

export default function AccessoriesClient() {
  preloadScene({ images: WATCHES.map((w) => w.image) });
  preload(ARM.image, { as: "image" });
  return <AccessoriesScene />;
}
