import type { SafetyCategory } from "@prisma/client";

/**
 * Lightweight, keyword-based pre-generation safety classifier. This is a
 * pragmatic first line of defense — cheap, deterministic, and fast — meant
 * to short-circuit clearly high-risk messages before they reach the LLM.
 * It is NOT a substitute for a proper moderation model; wire one in at
 * `classifyInput` for production (e.g. OpenAI Moderation, a Claude
 * classifier call, or a dedicated safety service) and keep this as a fast
 * pre-filter / fallback.
 */

const PATTERNS: Array<{ category: SafetyCategory; severity: "low" | "medium" | "high" | "critical"; re: RegExp }> = [
  {
    category: "self_harm",
    severity: "critical",
    re: /\b(suicide|kill myself|end my life|self.?harm|want to die|khud ko|आत्महत्या|खुद को नुकसान|મરી જવા|આત્મહત્યા)\b/i,
  },
  {
    category: "abuse_threat",
    severity: "critical",
    re: /\b(domestic violence|he hits me|she hits me|beats me|marta hai|maar dala|मारता है|पीटता है|मारपीट|મારે છે|હિંસા)\b/i,
  },
  {
    category: "medical",
    severity: "medium",
    re: /\b(cancer|tumou?r|diagnos(is|e)|will i die|disease|bimari|bimaari|बीमारी|कैंसर|મરવાનું|બીમારી)\b/i,
  },
  {
    category: "legal",
    severity: "medium",
    re: /\b(lawsuit|court case|sue (him|her|them)|legal notice|FIR|अदालत|मुकदमा|કોર્ટ|મુકદ્દમો)\b/i,
  },
  {
    category: "financial",
    severity: "medium",
    re: /\b(which stock|crypto|invest \d|loan (approv|amount)|lottery|share market tip|शेयर|निवेश करूं|ક્રિપ્ટો|રોકાણ)\b/i,
  },
  {
    category: "hate_or_discrimination",
    severity: "high",
    re: /\b(caste|jaati|lower caste|upper caste|जाति)\b.*\b(marry|marriage|शादी|લગ્ન)\b/i,
  },
];

export type SafetyClassification = {
  category: SafetyCategory;
  severity: "low" | "medium" | "high" | "critical";
} | null;

export function classifyInput(text: string): SafetyClassification {
  for (const p of PATTERNS) {
    if (p.re.test(text)) return { category: p.category, severity: p.severity };
  }
  return null;
}

/** Maps a classified category to the SAFE_REDIRECTS key, or null if the AI should still handle it normally. */
export function toRedirectKey(
  category: SafetyCategory
): "medical" | "legal" | "financial" | "self_harm" | "abuse_threat" | "severe_distress" | null {
  switch (category) {
    case "medical":
    case "legal":
    case "financial":
    case "self_harm":
    case "abuse_threat":
      return category;
    case "severe_distress":
      return "severe_distress";
    default:
      return null;
  }
}

const OUTPUT_RED_FLAGS = [
  /guaranteed?\b/i,
  /100% (accurate|certain|sure)/i,
  /definitely (will|happen|get|marry)/i,
  /curse|black magic|possessed/i,
];

/** Cheap post-generation scan; flags (does not block) output containing forbidden-phrase patterns for admin review. */
export function scanOutputForRedFlags(text: string): boolean {
  return OUTPUT_RED_FLAGS.some((re) => re.test(text));
}
