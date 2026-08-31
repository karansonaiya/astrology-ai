"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useI18n, useT } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme/provider";
import { apiFetch } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { InstallButton } from "@/components/layout/install-button";

export default function SettingsPage() {
  const t = useT();
  const { locale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [notifications, setNotifications] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteBirthDetails = useMutation({
    mutationFn: () => apiFetch("/api/birth-profile", { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["birth-profile-summary"] });
      toast({ title: t("settings.deleteBirthDetails"), variant: "success" });
    },
  });

  const exportData = async () => {
    const res = await fetch("/api/account/export", { method: "POST" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jyoti-ai-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAccount = useMutation({
    mutationFn: () => apiFetch("/api/account/delete", { method: "POST" }),
    onSuccess: () => {
      signOut({ callbackUrl: "/" });
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="font-heading text-2xl font-semibold">{t("settings.title")}</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t("settings.language")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm text-muted">{locale.toUpperCase()}</span>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">{t("settings.theme")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm text-muted">{theme === "dark" ? t("settings.themeDark") : t("settings.themeLight")}</span>
          <Switch checked={theme === "light"} onCheckedChange={(v) => setTheme(v ? "light" : "dark")} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">{t("settings.notifications")}</CardTitle>
          <CardDescription>{t("settings.notificationsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm text-muted">Daily horoscope reminder</span>
          <Switch checked={notifications} onCheckedChange={setNotifications} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">{t("settings.installApp")}</CardTitle>
          <CardDescription>{t("settings.installAppDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <InstallButton />
        </CardContent>
      </Card>

      <Card className="mt-4 border-danger/30">
        <CardHeader>
          <CardTitle className="text-base">{t("settings.privacy")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button variant="outline" onClick={exportData}>{t("settings.exportData")}</Button>
          <Button variant="outline" onClick={() => deleteBirthDetails.mutate()}>{t("settings.deleteBirthDetails")}</Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>{t("settings.deleteAccount")}</Button>
        </CardContent>
      </Card>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.deleteAccount")}</DialogTitle>
            <DialogDescription>{t("settings.deleteAccountWarning")}</DialogDescription>
          </DialogHeader>
          <Button variant="danger" className="w-full" onClick={() => deleteAccount.mutate()} disabled={deleteAccount.isPending}>
            {t("common.confirm")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
