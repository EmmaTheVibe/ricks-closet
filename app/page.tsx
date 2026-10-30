import type { Metadata, Viewport } from "next";
import HomeClient from "@/components/home/HomeClient";
import WelcomeCard from "@/components/home/WelcomeCard";
import { BACKGROUND } from "@/components/rack/constants";

export const metadata: Metadata = {
  title: "Rick’s Closet",
  description: "Shop at Rick’s Closet.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: BACKGROUND,
};

export default function WelcomePage() {
  return <HomeClient fallback={<WelcomeCard />} />;
}
