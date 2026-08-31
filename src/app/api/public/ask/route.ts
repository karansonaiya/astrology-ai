import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/auth/guard";
import { publicAskSchema } from "@/lib/validations/public-ask";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { generateAstrologyReply } from "@/lib/ai";
import { verifyCaptcha } from "@/lib/captcha";

// No login required — a free, unauthenticated "try it once" question for
// marketing-site visitors, so someone can see what Jyoti AI does before
// signing up. Deliberately NOT wired to the credit system (no account to
// charge); rate-limited by IP instead, matching the logged-in free quota
// (FREE_QUESTIONS_CAP = 3, see src/lib/pricing/catalog.ts) so the "give
// everyone a free taste" policy stays consistent whether or not they're
// signed in.
const PUBLIC_ASK_MAX = 3;
const PUBLIC_ASK_WINDOW_SECONDS = 24 * 60 * 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = publicAskSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const ip = getClientIp(req.headers);
    const rl = await rateLimit("public-ask", ip, PUBLIC_ASK_MAX, PUBLIC_ASK_WINDOW_SECONDS);
    if (!rl.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    // No-op (always true) while CAPTCHA_PROVIDER="none" — see captcha.ts.
    // This is the highest-value place for it in the app: the one AI
    // endpoint that costs real money per call and needs no login at all.
    if (!(await verifyCaptcha(parsed.data.captchaToken))) {
      return NextResponse.json({ error: "captcha_failed" }, { status: 400 });
    }

    // Stateless by design — no Chat/Message rows (there's no account to own
    // them), so nothing here persists beyond the AiUsageLog cost/analytics
    // entry generateAstrologyReply already writes (userId left undefined).
    const result = await generateAstrologyReply({
      locale: parsed.data.locale,
      history: [],
      userMessage: parsed.data.question,
      feature: "public_ask",
    });

    return NextResponse.json({ text: result.text });
  } catch (err) {
    return errorResponse(err);
  }
}
