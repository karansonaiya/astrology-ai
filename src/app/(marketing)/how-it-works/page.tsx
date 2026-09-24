import type { Metadata } from "next";
import { HowItWorksContent } from "./how-it-works-content";

export const metadata: Metadata = {
  title: "How Prerna AI Works | Prerna AI",
  description: "How Prerna AI turns your birth details into private, AI-generated astrology-style guidance in three steps.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
