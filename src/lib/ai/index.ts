import { prisma } from "@/lib/prisma";
import { getAiProvider, type ChatTurn } from "./provider";
import { buildSystemPrompt, SAFE_REDIRECTS, DISCLOSURE } from "./policy";
import { classifyInput, toRedirectKey, scanOutputForRedFlags } from "./safety";
import type { AppLocale } from "@/lib/i18n/config";
import type { SafetyCategory } from "@prisma/client";

const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 700);

// Rough $/1K-token estimates for admin cost dashboards. Update to match
// your actual contracted pricing — these are placeholders, not billing data.
const COST_PER_1K: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5": { in: 0.003, out: 0.015 },
  "gpt-4.1-mini": { in: 0.0004, out: 0.0016 },
  "gemini-2.5-flash": { in: 0.0003, out: 0.0025 },
  "mock-astrology-v1": { in: 0, out: 0 },
};

function estimateCostUsd(model: string, promptTokens: number, completionTokens: number) {
  const rates = COST_PER_1K[model] ?? { in: 0.002, out: 0.008 };
  return (promptTokens / 1000) * rates.in + (completionTokens / 1000) * rates.out;
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
};

export type GenerateReplyResult = {
  text: string;
  disclosureIncluded: boolean;
  safetyCategory: SafetyCategory;
  wasRedirected: boolean;
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
  const system = buildSystemPrompt(params.locale, { birthContext: params.birthContext });

  const result = await provider.complete({
    system,
    messages: [...params.history, { role: "user", content: params.userMessage, image: params.userImage }],
    maxTokens: params.maxTokens ?? MAX_OUTPUT_TOKENS,
  });

  const flaggedOutput = scanOutputForRedFlags(result.text);
  const disclosureIncluded = result.text.includes(DISCLOSURE[params.locale].slice(0, 12));
  const finalText = disclosureIncluded ? result.text : `${result.text}\n\n${DISCLOSURE[params.locale]}`;

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
  };
}
