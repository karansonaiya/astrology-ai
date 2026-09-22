"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { usePushSubscription } from "@/lib/push/use-push-subscription";
import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// Per-browser, not per-account (a plain localStorage flag) — deliberately:
// this is "don't ask on THIS device again", not tied to the user's data,
// same reasoning as the rest of this app's browser-storage usage (device-
// local convenience, never a source of truth read back by the server).
const DISMISS_KEY = "prerna_notif_prompt_dismissed";

/**
 * A once-per-device nudge to enable the daily-reminder push notification —
 * without this, the only way to discover the feature was to already be in
 * Settings, which most people never open unprompted. Shown for any signed-
 * in user who hasn't subscribed yet and hasn't dismissed this before;
 * disappears permanently (this device) once they enable it or dismiss it -
 * never re-nags on every visit.
 */
export function NotificationPermissionPrompt() {
  const t = useT();
  const push = usePushSubscription();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(true); // starts hidden until the localStorage check below resolves, so it never flashes on then off

  useEffect(() => {
    // Deliberately reads localStorage only after mount, not in a lazy
    // useState initializer: localStorage doesn't exist during the server
    // render, so an initializer would either throw there or mismatch
    // whatever the client's real value turns out to be. Starting hidden and
    // correcting once on the client (this one extra render) is the standard
    // safe pattern for this exact class of "server has no opinion, client
    // has a real stored value" state.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // Storage inaccessible (private-mode quirk etc.) - just stays hidden, not worth surfacing.
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Best-effort only - worst case this prompt reappears next visit, not a real failure.
    }
  };

  const enable = async () => {
    const ok = await push.subscribe();
    if (ok) dismiss();
    // Found in a full audit: a failed subscribe attempt here left the
    // banner just sitting there with zero feedback — the person has no way
    // to tell whether clicking did anything at all.
    else toast({ title: t("errors.generic"), variant: "danger" });
  };

  if (push.loading || push.state !== "ready" || push.subscribed || dismissed) return null;

  return (
    <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 md:mx-8">
      <div className="flex min-w-0 items-center gap-3">
        <Bell size={18} className="shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{t("notifications.promptTitle")}</p>
          <p className="text-xs text-muted">{t("notifications.promptDesc")}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={enable}>
          {t("notifications.promptEnable")}
        </Button>
        <button type="button" onClick={dismiss} className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface" aria-label={t("common.close")}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
