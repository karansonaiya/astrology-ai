import type { Metadata } from "next";
import { PanchangContent } from "./panchang-content";
import { AdSlot } from "@/components/ads/ad-slot";

export const metadata: Metadata = {
  title: "Panchang — Today's Tithi, Nakshatra & Muhurat | Prerna AI",
  description: "Today's Panchang: tithi, nakshatra, yoga, karana, and auspicious muhurat windows, calculated for your city.",
  alternates: { canonical: "/panchang" },
};

export default function PanchangPage() {
  return (
    <>
      <PanchangContent />
      <AdSlot />
    </>
  );
}
