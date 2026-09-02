"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";

export function InstallButton({ className }: { className?: string }) {
  const t = useT();
  const [available, setAvailable] = useState(() => typeof window !== "undefined" && !!window.__prernaInstallPrompt);

  useEffect(() => {
    const handler = () => setAvailable(true);
    window.addEventListener("prerna-install-available", handler);
    return () => window.removeEventListener("prerna-install-available", handler);
  }, []);

  if (!available) return null;

  const onClick = async () => {
    const promptEvent = window.__prernaInstallPrompt;
    if (!promptEvent) return;
    await promptEvent.prompt();
    window.__prernaInstallPrompt = undefined;
    setAvailable(false);
  };

  return (
    <Button variant="outline" size="sm" onClick={onClick} className={className}>
      <Download size={14} /> {t("common.install")}
    </Button>
  );
}
