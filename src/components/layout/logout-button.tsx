"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function LogoutButton({ variant = "icon" }: { variant?: "icon" | "full" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const confirmLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <>
      {variant === "icon" ? (
        <Button variant="ghost" size="icon" aria-label={t("common.logout")} onClick={() => setOpen(true)}>
          <LogOut size={16} />
        </Button>
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
