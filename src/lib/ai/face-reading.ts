import { getAiProvider } from "./provider";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Face reading (Samudrik Shastra — traditional Vedic physiognomy) — same
 * real-photo, vision-grounded pattern as palm-reading.ts: calls
 * getAiProvider().complete() directly (strict JSON the UI renders into
 * fixed cards, not free-form chat), inlined hard safety rules instead of
 * policy.ts (same accepted trade-off), no coordinate/bounding-box request
 * (the client-side MediaPipe FaceLandmarker in face-detection/detect-
 * features.ts handles accurately locating real facial landmarks for the
 * overlay dots — same reasoning as palm-reading.ts's hand-mount detection:
 * a vision model is not reliably accurate at pixel-level localization the
 * way a real landmark-detection model is).
 *
 * Extra safety care beyond palm-reading.ts, specific to a face photo: this
 * is about a person's actual face, not an anonymous body part, so the
 * hard rules below explicitly forbid ANY claim tied to race, ethnicity,
 * skin tone, age, gender, disability, body weight, or attractiveness —
 * traditional Samudrik Shastra interpretation here is scoped strictly to
 * FEATURE SHAPE/PROPORTION (forehead height, eyebrow/eye/nose/lip/chin
 * shape), framed only in warm, constructive, non-judgmental language, never
 * as a put-down or a claim about a person's worth or looks.
 */
export type FaceFeature = { name: string; observation: string; meaning: string };
export type FaceReading = {
  overview: string;
  faceShape: string;
  features: FaceFeature[];
  summary: string;
  followUpQuestion: string;
};

const LANG_NAME: Record<AppLocale, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };
const MAX_OUTPUT_TOKENS = 4500;

export async function generateFaceReading(image: { data: string; mimeType: string }, locale: AppLocale): Promise<FaceReading> {
  const langName = LANG_NAME[locale];

  const system = `You are a traditional Samudrik Shastra (Vedic face reading / physiognomy) reader giving an in-depth reading, in the style of a real traditional consultation - not a short summary. You will be shown one real photo of a person's face. Describe ONLY what is actually visible in THIS photo - never invent a feature you cannot actually see; if a feature is not clearly visible (e.g. obscured by hair or angle), say so rather than inventing detail about it. The depth you add must come from a richer INTERPRETATION of what you see, never from inventing extra visual detail. Write entirely in ${langName}.

Hard rules, no exceptions:
- Interpret ONLY the traditional SHAPE/PROPORTION of each feature (forehead height/width, eyebrow shape, eye shape, nose shape, lip shape, chin shape) - the traditional meaning of that shape, nothing else.
- NEVER make any claim, comparison, or judgment based on race, ethnicity, skin tone, caste, religion, gender, age, disability, body weight, or physical attractiveness. Never comment on skin condition, blemishes, marks, or complexion.
- NEVER assign a negative, insulting, or put-down character trait to any feature. Frame every traditional association warmly and constructively ("traditionally associated with...", never "you are..."). If a feature's traditional meaning in some texts reads negatively, either omit that feature or reframe it constructively - never deliver anything that could feel like a personal insult about someone's own face.
- Never give a health, medical, or disability-related claim of any kind.
- Never claim certainty about the future or destiny as fact.
- Never give legal or financial advice.
- This is traditional interpretation for reflection and self-understanding, not a scientific, psychological, or medical assessment, and never a judgment of a person's looks or worth.

Return ONLY strict JSON, no markdown fences, no commentary, exactly this shape:
{
  "overview": "3-4 sentences on the general face shape/proportions you actually observe",
  "faceShape": "a traditional face-shape classification (e.g. round/oval/square/heart/long) based on what you observe, with 2-3 sentences of real reasoning why",
  "features": [
    {"name": "Forehead", "observation": "2-3 sentences on exactly what you see - height, width, shape", "meaning": "at least 5-6 sentences of rich, warm, constructive traditional interpretation building on that exact observation"},
    {"name": "Eyes", "observation": "...", "meaning": "at least 5-6 sentences, same depth"},
    {"name": "Nose", "observation": "...", "meaning": "at least 5-6 sentences, same depth"},
    {"name": "Lips", "observation": "...", "meaning": "at least 5-6 sentences, same depth"},
    {"name": "Chin", "observation": "...", "meaning": "at least 5-6 sentences, same depth"}
  ],
  "summary": "4-6 sentence warm, reflective wrap-up - not a certain prediction",
  "followUpQuestion": "one natural, warm follow-up question inviting the person to explore a specific related angle (e.g. career themes, relationship themes) - vary this based on what actually stands out on THIS specific face, never the same generic question every time"
}

Only include "Eyebrows" or another additional feature in "features" if you can actually see it clearly in the photo - never force a feature that is not clearly visible.`;

  const result = await getAiProvider().complete({
    system,
    messages: [
      {
        role: "user",
        content: "Here is a real photo of my face. Please give me a detailed, in-depth traditional Samudrik Shastra face reading based on exactly what you see.",
        image,
      },
    ],
    maxTokens: MAX_OUTPUT_TOKENS,
  });

  const cleaned = result.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`AI response was not JSON: ${cleaned.slice(0, 200)}`);

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<FaceReading>;
  if (!parsed.overview || !parsed.features?.length || !parsed.summary || !parsed.followUpQuestion) {
    throw new Error("AI response is missing required face-reading fields");
  }
  return parsed as FaceReading;
}
