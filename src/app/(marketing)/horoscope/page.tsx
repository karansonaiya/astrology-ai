import type { Metadata } from "next";
import { HoroscopeContent } from "./horoscope-content";
import { AdSlot } from "@/components/ads/ad-slot";

export const metadata: Metadata = {
  title: "Daily Horoscope — All 12 Zodiac Signs | Prerna AI",
  description: "Read today's horoscope for your zodiac sign — AI-generated guidance for reflection, refreshed daily, in English, Hindi, and Gujarati.",
  alternates: { canonical: "/horoscope" },
};

export default function HoroscopePage() {
  return (
    <>
      <HoroscopeContent />
      <AdSlot />
    </>
  );
}
