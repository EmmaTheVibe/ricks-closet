"use client";

import dynamic from "next/dynamic";

// `ssr: false` is only allowed in Client Components, so the page renders this wrapper.
const RackScene = dynamic(() => import("./RackScene"), { ssr: false });

export default function RackClient() {
  return <RackScene />;
}
