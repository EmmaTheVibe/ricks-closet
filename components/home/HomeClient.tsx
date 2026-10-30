"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { BACKGROUND } from "../rack/constants";
import RackLoading from "../rack/RackLoading";

const WardrobeScene = dynamic(() => import("./WardrobeScene"), {
  ssr: false,
  loading: () => (
    <main className="relative h-dvh w-full" style={{ background: BACKGROUND }}>
      <RackLoading />
    </main>
  ),
});

export default function HomeClient({ fallback }: { fallback: ReactNode }) {
  return <WardrobeScene fallback={fallback} />;
}
