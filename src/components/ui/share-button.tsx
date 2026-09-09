"use client";

import { Share2 } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

/**
 * "Share" on a horoscope/kundli result — found live, this app had no way to
 * pass a result along at all. For an astrology app with an Indian audience,
 * someone forwarding their own horoscope/kundli result on WhatsApp is
 * normally the single cheapest, highest-reach organic growth channel there
 * is (the recipient already trusts the sender, unlike an ad) — this button
 * is what makes that possible.
 *
 * navigator.share() (the native OS share sheet — WhatsApp is always one of
 * the first options on a phone) is tried first since it's the best UX where
 * it exists; most desktop browsers don't implement it, so a WhatsApp web
 * link (wa.me) is the fallback rather than silently doing nothing. Sharing
 * is opt-in and user-initiated either way — nothing here posts or sends
 * anything on its own.
 */
export function ShareButton({ title, text, url }: { title: string; text: string; url?: string }) {
  const t = useT();
  const { toast } = useToast();
  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // AbortError (user closed the share sheet) and any other failure are
        // both silent no-ops here — there's nothing useful to tell the user
        // about "you decided not to share" or a share sheet quirk.
      }
      return;
    }

    // No native share sheet (most desktop browsers) — open a pre-filled
    // WhatsApp Web/app compose instead of just copying to clipboard, since
    // WhatsApp is specifically the channel this is for.
    const whatsappText = encodeURIComponent(`${text}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${whatsappText}`, "_blank", "noopener,noreferrer");
    toast({ title: t("common.shareOpenedWhatsapp"), variant: "success" });
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleShare}>
      <Share2 size={14} /> {t("common.share")}
    </Button>
  );
}
