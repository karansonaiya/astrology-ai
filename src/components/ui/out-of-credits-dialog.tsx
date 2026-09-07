"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";

/**
 * Shown (as a centered modal, not a corner toast) whenever a feature's
 * consumeQuestionCredit() throws OutOfCreditsError (HTTP 402) — chat,
 * career, relationship, compatibility, kundli-explain all hit this the same
 * way. A toast was too easy to miss/dismiss without ever seeing a path to
 * buy more credits; this puts the /credits link front and center instead.
 *
 * `personaName` (chat only, when a persona is active) swaps in a
 * conversation-specific re-engagement line instead of the generic one —
 * inspired by a competitor app's "come back and finish this" nudge at their
 * own free-minutes wall, but deliberately NOT copying its "know the
 * solutions to all your problems" framing: that's exactly the certainty-
 * claim style this app's own policy (src/lib/ai/policy.ts) bans everywhere
 * else, so the copy here stays within "reflection, not certainty" — it
 * points back at the real chart already in progress, not a promised outcome.
 */
export function OutOfCreditsDialog({
  open,
  onOpenChange,
  personaName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personaName?: string;
}) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("chat.outOfCreditsTitle")}</DialogTitle>
          <DialogDescription>
            {personaName ? t("chat.outOfCreditsDescPersona", { persona: personaName }) : t("chat.outOfCreditsDesc")}
          </DialogDescription>
        </DialogHeader>
        <Button asChild className="w-full">
          <Link href="/credits">{t("chat.viewPlans")}</Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
