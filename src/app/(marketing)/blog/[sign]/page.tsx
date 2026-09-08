import { BlogSignContent } from "./blog-sign-content";
import { AdSlot } from "@/components/ads/ad-slot";

export default function BlogSignPage({ params }: { params: Promise<{ sign: string }> }) {
  return (
    <>
      <BlogSignContent params={params} />
      <AdSlot />
    </>
  );
}
