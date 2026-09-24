import type { Metadata } from "next";
import { FaqContent } from "./faq-content";
import { AdSlot } from "@/components/ads/ad-slot";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Prerna AI",
  description: "Answers about Prerna AI's astrology guidance, credits and pricing, privacy, and how the AI-powered readings work.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <>
      <FaqContent />
      <AdSlot />
    </>
  );
}
