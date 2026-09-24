import type { Metadata } from "next";
import { FeaturesContent } from "./features-content";

export const metadata: Metadata = {
  title: "Features | Prerna AI",
  description: "AI chat, daily horoscope, Kundli, compatibility matching, detailed reports, and multilingual support — all in Prerna AI.",
  alternates: { canonical: "/features" },
};

export default function FeaturesPage() {
  return <FeaturesContent />;
}
