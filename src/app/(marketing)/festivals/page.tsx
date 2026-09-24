import type { Metadata } from "next";
import { FestivalsContent } from "./festivals-content";
import { AdSlot } from "@/components/ads/ad-slot";

export const metadata: Metadata = {
  title: "Hindu Festivals Calendar | Prerna AI",
  description: "Upcoming Hindu festivals and their dates, with real Panchang-based timing.",
  alternates: { canonical: "/festivals" },
};

export default function FestivalsPage() {
  return (
    <>
      <FestivalsContent />
      <AdSlot />
    </>
  );
}
