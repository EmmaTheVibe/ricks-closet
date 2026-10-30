"use client";

import dynamic from "next/dynamic";
import RackLoading from "../rack/RackLoading";

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
