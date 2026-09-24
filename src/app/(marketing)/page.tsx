import type { Metadata } from "next";
import { LandingContent } from "./landing-content";

// Found in a full audit: this page was entirely "use client", which meant it
// (and every other client-component page in the app) could never export
// `metadata` at all — Next.js only reads that export from a Server
// Component. It — and every page under this app — shared the exact same
// generic title/description from the root layout as a result. Split into
// this thin server wrapper (which can carry real metadata) + the actual
// page in landing-content.tsx (unchanged, still "use client" — it needs the
// i18n hooks and framer-motion), same pattern already used by faq/horoscope/
// panchang/blog/festivals in this route group.
export const metadata: Metadata = {
  title: "Prerna AI — Private AI-powered astrology insights",
  description: "Private, AI-powered astrology-style guidance in Gujarati, Hindi, and English. Chat, daily horoscope, Kundli, compatibility, and reports — AI-generated guidance for reflection, not certainty.",
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return <LandingContent />;
}
