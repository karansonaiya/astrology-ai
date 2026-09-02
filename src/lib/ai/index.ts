import { prisma } from "@/lib/prisma";
import { getAiProvider, type ChatTurn } from "./provider";
import { buildSystemPrompt, SAFE_REDIRECTS, DISCLOSURE, FOLLOWUP_MARKER } from "./policy";
import { classifyInput, toRedirectKey, scanOutputForRedFlags } from "./safety";
import type { AppLocale } from "@/lib/i18n/config";
import type { SafetyCategory } from "@prisma/client";

// Default was 700 — raised to 2000 (see .env's comment). Found live
// (2026-09-02, a Gujarati career question): even with provider.ts's
// thinkingConfig.thinkingBudget set to the minimum accepted value,
// gemini-3.6-flash still spent 600-900+ tokens on invisible "thinking" out
// of the budget, cutting the visible Gujarati reply off after 1-2
// sentences (finishReason: "MAX_TOKENS"). thinkingBudget is apparently not
// a hard cap for this model — it scaled with however much room was
// available rather than staying near the requested minimum. Gujarati/Hindi
// also tokenize far less efficiently than English, so the same reply needs
// more tokens regardless. Confirmed live: 2000 reliably finishes with
// finishReason "STOP" for a normal chat/career/relationship reply in any
// of the three languages.
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 2000);

// Rough $/1K-token estimates for admin cost dashboards. Update to match
// your actual contracted pricing — these are placeholders, not billing data.
const COST_PER_1K: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5": { in: 0.003, out: 0.015 },
  "gpt-4.1-mini": { in: 0.0004, out: 0.0016 },
  "gemini-2.5-flash": { in: 0.0003, out: 0.0025 }, // retired for new/billed keys, kept for old log rows
  // Verified from https://ai.google.dev/gemini-api/docs/pricing on 2026-08-31
  // (standard paid tier, promo rate through Dec 31 2026 — rises to $1.50/$7.50
  // per 1M on Jan 1 2027, update this then).
  "gemini-3.6-flash": { in: 0.00075, out: 0.00375 },
  "mock-astrology-v1": { in: 0, out: 0 },
};

function estimateCostUsd(model: string, promptTokens: number, completionTokens: number) {
  const rates = COST_PER_1K[model] ?? { in: 0.002, out: 0.008 };
  return (promptTokens / 1000) * rates.in + (completionTokens / 1000) * rates.out;
}

// Which language the disclosure should actually be written in — the reply's
// OWN language, not necessarily the chat/account's configured locale. Found
// live: a user whose account locale is "gu" asked a question in English,
// the model correctly answered in English (per policy.ts's "write in the
// user's language unless they explicitly ask otherwise"), but the
// disclosure — keyed only off params.locale — came out in Gujarati under an
// English reply. Gujarati and Devanagari (Hindi) are disjoint Unicode
// blocks, so a simple presence check is reliable even for the common
// code-switched case (Gujarati sentence with English loanwords like
// "career"/"compatibility") — Gujarati script anywhere in the reply is a
// strong enough signal on its own, no need for full language detection.
function detectReplyLocale(text: string, fallback: AppLocale): AppLocale {
  if (/[઀-૿]/.test(text)) return "gu"; // Gujarati Unicode block
  if (/[ऀ-ॿ]/.test(text)) return "hi"; // Devanagari (Hindi) Unicode block
  if (/[a-zA-Z]{10,}/.test(text)) return "en";
  return fallback;
}

export type GenerateReplyParams = {
  userId?: string;
  locale: AppLocale;
  history: ChatTurn[]; // does not include the new user message
  userMessage: string;
  userImage?: { data: string; mimeType: string };
  birthContext?: string;
  feature?: string; // "chat" | "horoscope" | "kundli" | "compatibility" | "career" | "relationship" | "report"
  /**
   * Override the default chat-tuned budget (AI_MAX_OUTPUT_TOKENS, 700) for
   * features that need substantially more room — e.g. a paid multi-section
   * report. Found live: report generation was silently truncating to a
   * single sentence at the default budget (same root cause hit and fixed
   * for horoscope content — see horoscope-content.ts — Gemini 2.5 Flash's
   * internal "thinking" tokens also count against maxTokens, eating into
   * the visible-output budget).
   */
  maxTokens?: number;
  /**
   * Chat-only, for engagement — asks the model to suggest one natural
   * follow-up question after its answer (see policy.ts's FOLLOWUP_MARKER),
   * which is split out of the visible text here and returned separately as
   * `followUpQuestion` so the UI can show it as a clickable suggestion chip
   * rather than as literal text in the reply. Not persisted to the
   * Message row — it's a live suggestion for the turn just generated, not
   * part of the permanent chat record.
   */
  includeFollowUp?: boolean;
  /** Chat-only. A persona's tone/identity flavor (see src/lib/personas/catalog.ts) — passed straight through to buildSystemPrompt. */
  personaFlavor?: string;
};

export type GenerateReplyResult = {
  text: string;
  disclosureIncluded: boolean;
  safetyCategory: SafetyCategory;
  wasRedirected: boolean;
  followUpQuestion?: string;
};

/**
 * The single entrypoint every feature (chat, career insight, compatibility,
 * etc.) should call. Runs the pre-generation safety classifier, applies the
 * policy system prompt, calls the configured AI provider, logs usage/cost,
 * and records a SafetyFlag row for anything risky — whether it was
 * redirected or passed through to the model.
 */
export async function generateAstrologyReply(params: GenerateReplyParams): Promise<GenerateReplyResult> {
  const classification = classifyInput(params.userMessage);
  const redirectKey = classification ? toRedirectKey(classification.category) : null;

  if (redirectKey) {
    const text = SAFE_REDIRECTS[params.locale][redirectKey];
    return {
      text,
      disclosureIncluded: false,
      safetyCategory: classification!.category,
      wasRedirected: true,
    };
  }

  const provider = getAiProvider();
  const system = buildSystemPrompt(params.locale, {
    birthContext: params.birthContext,
    includeFollowUp: params.includeFollowUp,
    personaFlavor: params.personaFlavor,
  });

  const result = await provider.complete({
    system,
    messages: [...params.history, { role: "user", content: params.userMessage, image: params.userImage }],
    maxTokens: params.maxTokens ?? MAX_OUTPUT_TOKENS,
  });

  // Split the model's own text from its suggested follow-up (see
  // policy.ts's FOLLOWUP_MARKER) BEFORE running the red-flag scan/disclosure
  // append below, so neither ever sees or touches the marker line.
  let mainText = result.text;
  let followUpQuestion: string | undefined;
  const markerIndex = result.text.indexOf(FOLLOWUP_MARKER);
  if (markerIndex !== -1) {
    mainText = result.text.slice(0, markerIndex).trim();
    followUpQuestion = result.text.slice(markerIndex + FOLLOWUP_MARKER.length).trim() || undefined;
  }

  const flaggedOutput = scanOutputForRedFlags(mainText);
  // Always append the canonical disclosure ourselves — never conditionally,
  // and never rely on detecting whether the model already wrote one.
  // Found live (a Gujarati reply): policy.ts used to ALSO instruct the
  // model to write its own closing disclosure "translated naturally", so
  // the model wrote its own phrasing ("નોંધ: આ AI દ્વારા જનરેટ કરાયેલ...")
  // which didn't match this file's hardcoded DISCLOSURE string closely
  // enough for the substring check below to recognize it — so the exact
  // English DISCLOSURE got appended a second time underneath the model's
  // own Gujarati one. Real fix: policy.ts no longer asks the model to
  // write a disclosure at all (see its comment), so this is now always a
  // plain, unconditional append — exactly one disclosure, always in the
  // right language, always the exact reviewed wording — EXCEPT "right
  // language" isn't always params.locale: policy.ts lets the model answer
  // in whatever language the user actually typed in, which can differ from
  // their configured account/chat locale (e.g. a Gujarati-locale account
  // asking a question in English). Found live: that produced an English
  // reply with a Gujarati disclosure underneath it. detectReplyLocale
  // matches the disclosure to the reply's own script instead.
  const finalText = `${mainText}\n\n${DISCLOSURE[detectReplyLocale(mainText, params.locale)]}`;

  await prisma.aiUsageLog.create({
    data: {
      userId: params.userId,
      feature: params.feature ?? "chat",
      provider: result.provider,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costEstimateUsd: estimateCostUsd(result.model, result.promptTokens, result.completionTokens),
    },
  });

  return {
    text: finalText,
    disclosureIncluded: true,
    safetyCategory: (classification?.category ?? (flaggedOutput ? "other_policy_violation" : "none")) as SafetyCategory,
    wasRedirected: false,
    followUpQuestion,
  };
}
