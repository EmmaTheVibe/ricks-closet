"use client";

import dynamic from "next/dynamic";
import { preloadScene } from "./preloadScene";
import RackLoading from "./RackLoading";
import { SHIRTS } from "./shirts";

const RackScene = dynamic(() => import("./RackScene"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full w-full">
      <RackLoading />
    </div>
  ),
});

export default function RackClient() {
  preloadScene({
    images: SHIRTS.flatMap((s) => [s.texture, s.side, s.sideLeft].filter((u): u is string => Boolean(u))),
  });
  return <RackScene />;
}
