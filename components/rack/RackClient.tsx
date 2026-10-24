"use client";

import dynamic from "next/dynamic";
import RackLoading from "./RackLoading";

// `ssr: false` is only allowed in Client Components, so the page renders this wrapper.
const RackScene = dynamic(() => import("./RackScene"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full w-full">
      <RackLoading />
    </div>
  ),
});

export default function RackClient() {
  return <RackScene />;
}
