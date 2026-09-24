import type { Metadata } from "next";
import { PricingContent } from "./pricing-content";

export const metadata: Metadata = {
  title: "Pricing | Prerna AI",
  description: "Free AI questions to start, then simple pay-as-you-go credit packs, subscriptions, and detailed one-time reports — transparent pricing, no hidden fees.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return <PricingContent />;
}
