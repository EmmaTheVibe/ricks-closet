"use client";

import dynamic from "next/dynamic";
import RackLoading from "../rack/RackLoading";

// `ssr: false` is only allowed in Client Components, so the page renders this wrapper.
const ShoeScene = dynamic(() => import("./ShoeScene"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full w-full">
      <RackLoading />
    </div>
  ),
});

export default function ShoesClient() {
  return <ShoeScene />;
}
