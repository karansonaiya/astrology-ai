import { getAiProvider } from "./provider";

/**
 * Push-notification copy generation — an admin-triggered, bulk-broadcast
 * tool (see /admin/notifications), same "controlled task+data prompt, not
 * free-form chat" reasoning as horoscope-content.ts and kundli-
 * explanation.ts for calling getAiProvider() directly instead of
 * generateAstrologyReply(). English only, deliberately: this goes out to
 * every subscribed user regardless of their own locale in one send (see
 * send-daily-reminder's cron, which does the same) — a real per-locale
 * version would need one send per locale, out of scope for this first cut.
 */
export type NotificationCopy = { title: string; body: string };

// Found live 2026-09-16 (testing the new automatic broadcast cron — see
// send-notification-broadcast/route.ts): 300 was too small. Same root
// cause documented in index.ts's MAX_OUTPUT_TOKENS comment — Gemini's
// internal "thinking" tokens count against maxOutputTokens, so a genuinely
// tiny budget like 300 sometimes left zero room for the actual visible
// JSON, and the response came back as a truncated text fragment with no
// `{`/`}` at all (reproduced live: topic "Kundli" failed this way, while
// other topics happened to fit). This ran unnoticed on the admin's manual
// broadcast tool (an admin would just retry), but the automatic cron has
// no one there to notice — a bigger budget is the real fix, not a retry
// loop papering over an under-sized one.
const MAX_OUTPUT_TOKENS = 1000;

export async function generateNotificationCopy(topic?: string): Promise<NotificationCopy> {
  const system = `You write short push-notification copy for Prerna AI, an astrology-guidance app. The goal is a genuine, curiosity-sparking nudge back into the app - never fear-based, never a false countdown/urgency claim, never a medical/legal/financial claim, never promising a certain outcome. Warm and inviting, not clickbait-shouty.

Return ONLY strict JSON, no markdown fences, no commentary, exactly this shape:
{"title": "max 40 characters, no emoji", "body": "max 90 characters, one short sentence, at most one emoji"}`;

  const userPrompt = topic
    ? `Write one push notification about: ${topic}`
    : "Write one general push notification inviting someone back to check their astrology guidance today - no specific topic given, keep it broadly inviting (e.g. today's reflection, a fresh question, checking in).";

  // One retry on a malformed/truncated response — this now runs
  // unattended (see send-notification-broadcast/route.ts's automatic
  // cron), unlike its original admin-manual-click-only use where a person
  // would just notice and retry by hand.
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await getAiProvider().complete({
        system,
        messages: [{ role: "user", content: userPrompt }],
        maxTokens: MAX_OUTPUT_TOKENS,
      });

      const cleaned = result.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error(`AI response was not JSON: ${cleaned.slice(0, 200)}`);

      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<NotificationCopy>;
      if (!parsed.title || !parsed.body) throw new Error("AI response is missing title/body");
      return { title: parsed.title, body: parsed.body };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError!;
}
