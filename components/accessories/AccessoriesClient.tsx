"use client";

import dynamic from "next/dynamic";
import RackLoading from "../rack/RackLoading";

const AccessoriesScene = dynamic(() => import("./AccessoriesScene"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full w-full">
      <RackLoading />
    </div>
  ),
});

export default function AccessoriesClient() {
  return <AccessoriesScene />;
}
