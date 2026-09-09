"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function LogoutButton({ variant = "icon" }: { variant?: "icon" | "full" | "menu-item" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      // Real navigation (window.location.href), not a client-side route
      // change — see next-auth's own signOut() implementation. If this
      // throws (a network blip mid-request), the catch below still resets
      // loggingOut instead of leaving the confirm dialog stuck on its
      // disabled "Loading…" state forever.
      await signOut({ callbackUrl: "/" });
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <Button variant="ghost" size="icon" aria-label={t("common.logout")} onClick={() => setOpen(true)}>
          <LogOut size={16} />
        </Button>
      ) : variant === "menu-item" ? (
        // Plain row, no Button wrapper — meant to sit inside a
        // DropdownMenuItem (see app-header.tsx's account dropdown), which
        // already provides the hover/focus/padding styling itself.
        //
        // Found live: clicking this inside the dropdown looked like logout
        // "did nothing" — the confirm Dialog would flash open and close
        // instantly. Root cause: Radix's DropdownMenu treats the same click
        // as a dismissal and starts closing (returning focus, unmounting its
        // content) in the same tick this button's onClick opens the Dialog,
        // and the Dialog's own outside-click/focus-return handling from that
        // still-in-flight dropdown close ends up immediately closing it too.
        // Deferring setOpen(true) to the next tick lets the dropdown finish
        // closing first, so the Dialog isn't opening into a still-live
        // dismissal — the standard fix for this Radix Dialog-inside-a-menu
        // combination.
        <button
          type="button"
          className="flex w-full items-center gap-2 text-danger"
          onClick={() => setTimeout(() => setOpen(true), 0)}
        >
          <LogOut size={15} /> {t("common.logout")}
        </button>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <LogOut size={16} /> {t("common.logout")}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("auth.logoutConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("auth.logoutConfirmDesc")}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loggingOut}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={confirmLogout} disabled={loggingOut}>
              {loggingOut ? t("common.loading") : t("common.logout")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
