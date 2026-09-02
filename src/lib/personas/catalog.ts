/**
 * Chat persona catalog — plain code constants, same "no DB table" pattern as
 * CREDIT_PACKS in src/lib/pricing/catalog.ts (see its header comment for
 * why): nothing here needs admin editability or FK relations, a persona is
 * referenced only by its `code` string (stored on Chat.personaCode).
 *
 * Each persona is a presentation/tone layer ONLY — `systemFlavor` gets
 * appended to the system prompt in policy.ts's buildSystemPrompt, always
 * AFTER the identity line and BEFORE the hard safety rules (FORBIDDEN_RULES/
 * THIRD_PARTY_READING_RULE), which stay unconditional and can never be
 * overridden by a persona. Every persona still answers from the user's real
 * calculated chart exactly like the un-personalized chat does — nothing
 * here changes birthContext construction (see the messages route).
 *
 * Names/taglines are deliberately plain English, not per-locale i18n keys —
 * matching the established precedent for catalog content in this app (see
 * REPORT_TEMPLATES in src/lib/pricing/catalog.ts: "Basic Birth Insight" etc.
 * render as-is regardless of UI locale, confirmed in reports/page.tsx). The
 * persona still WRITES its reply in the user's actual language — the name
 * itself is just a display label, like a brand name.
 */

export type PersonaSpecialty = "general" | "love" | "career" | "marriage";

export type Persona = {
  code: string;
  name: string;
  tagline: string;
  specialty: PersonaSpecialty;
  avatarColor: string; // Tailwind classes for the initials-circle fallback (shown if avatarImage fails to load)
  avatarImage: string; // public/ path — AI-generated portrait, see scripts/README or git history for generation notes
  systemFlavor: string;
};

export const PERSONAS: Persona[] = [
  {
    code: "acharya_dev",
    name: "Acharya Dev",
    tagline: "Traditional Vedic guidance, calm and classical",
    specialty: "general",
    avatarColor: "bg-gold/20 text-gold",
    avatarImage: "/personas/acharya_dev.webp",
    systemFlavor:
      "Your persona for this conversation is Acharya Dev — a traditional, classical Vedic astrologer. Speak calmly and formally, drawing on traditional astrological framing (grahas, bhavas, nakshatras) while staying warm and approachable, never cold or lecturing.",
  },
  {
    code: "priya",
    name: "Priya",
    tagline: "Warm, modern guidance for love & relationships",
    specialty: "love",
    avatarColor: "bg-danger/15 text-danger",
    avatarImage: "/personas/priya.webp",
    systemFlavor:
      "Your persona for this conversation is Priya — warm, modern, and emotionally attuned, especially on love and relationship questions. Speak like a caring, perceptive friend who happens to know astrology well — gentle, encouraging, never clinical.",
  },
  {
    code: "rohan",
    name: "Rohan",
    tagline: "Direct, practical guidance for career & business",
    specialty: "career",
    avatarColor: "bg-primary/20 text-primary",
    avatarImage: "/personas/rohan.webp",
    systemFlavor:
      "Your persona for this conversation is Rohan — direct, pragmatic, and modern, especially on career and business questions. Speak like a sharp, encouraging mentor: get to the point, favor concrete next steps over abstract musing, while staying warm.",
  },
  {
    code: "meera",
    name: "Meera",
    tagline: "Nurturing guidance for marriage & family",
    specialty: "marriage",
    avatarColor: "bg-success/15 text-success",
    avatarImage: "/personas/meera.webp",
    systemFlavor:
      "Your persona for this conversation is Meera — nurturing, family-oriented, and grounded, especially on marriage and family questions. Speak like a wise, warm elder relative: patient, reassuring, and rooted in practical family wisdom.",
  },
];

export function getPersona(code: string | null | undefined): Persona | undefined {
  return code ? PERSONAS.find((p) => p.code === code) : undefined;
}
