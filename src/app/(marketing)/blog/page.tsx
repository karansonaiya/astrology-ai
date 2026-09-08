import { BlogIndexContent } from "./blog-index-content";
import { AdSlot } from "@/components/ads/ad-slot";

// Server component wrapper — BlogIndexContent is "use client" (needs the
// i18n hooks), and AdSlot is an async server component (needs a real
// server-side auth()+DB check to decide whether to show an ad at all), so
// they're composed here as plain siblings rather than AdSlot being
// imported into the client file directly (which doesn't work — a "use
// client" file can't also export a server component).
export default function BlogIndexPage() {
  return (
    <>
      <BlogIndexContent />
      <AdSlot />
    </>
  );
}
