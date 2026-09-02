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
 */
export function OutOfCreditsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("chat.outOfCreditsTitle")}</DialogTitle>
          <DialogDescription>{t("chat.outOfCreditsDesc")}</DialogDescription>
        </DialogHeader>
        <Button asChild className="w-full">
          <Link href="/credits">{t("chat.viewPlans")}</Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
