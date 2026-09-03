import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/auth/guard";
import { sendMessageSchema } from "@/lib/validations/chat";
import { rateLimit } from "@/lib/rate-limit";
import { consumeQuestionCredit, refundQuestionCredit, OutOfCreditsError } from "@/lib/credits";
import { generateAstrologyReply } from "@/lib/ai";
import { getOrComputeKundliCalculation, summarizeKundliForAi } from "@/lib/astrology/adapter";
import { redactForLogs } from "@/lib/utils";
import type { AppLocale } from "@/lib/i18n/config";
import { getPersona } from "@/lib/personas/catalog";

const RATE_MAX = Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS ?? 8);
const RATE_WINDOW = Number(process.env.AI_RATE_LIMIT_WINDOW_SECONDS ?? 60);

function summarizeBirthProfile(profile: {
  birthDate: Date;
  birthTimeKnown: boolean;
  birthTime: string | null;
  birthCity: string | null;
  primaryInterest: string | null;
} | null) {
  if (!profile) return undefined;
  const parts = [`Birth date: ${profile.birthDate.toISOString().slice(0, 10)}`];
  parts.push(profile.birthTimeKnown && profile.birthTime ? `Birth time: ${profile.birthTime}` : "Birth time: unknown");
  if (profile.birthCity) parts.push(`Birth place: ${profile.birthCity}`);
  if (profile.primaryInterest) parts.push(`Stated main interest: ${profile.primaryInterest}`);
  return parts.join(". ");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const user = await requireUser();
    const { chatId } = await params;

    const rl = await rateLimit("chat-message", user.id, RATE_MAX, RATE_WINDOW);
    if (!rl.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: user.id, deletedAt: null },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
    });
    if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });

    let usedFree: boolean;
    try {
      const consumed = await consumeQuestionCredit(user.id, `chat:${chatId}`);
      usedFree = consumed.usedFree;
    } catch (err) {
      if (err instanceof OutOfCreditsError) {
        return NextResponse.json({ error: "out_of_credits" }, { status: 402 });
      }
      throw err;
    }

    const userMsg = await prisma.message.create({
      data: {
        chatId,
        role: "user",
        content: parsed.data.content,
        locale: chat.locale,
        imageData: parsed.data.image?.data,
        imageMimeType: parsed.data.image?.mimeType,
      },
    });

    const birthProfile = await prisma.birthProfile.findFirst({
      where: { userId: user.id, forSelf: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    // Ground the reply in the user's REAL calculated chart when one's
    // available, not just their birth date/city as free text — cached after
    // the first message (getOrComputeKundliCalculation reuses the stored
    // KundliCalculation), so this doesn't add a real astrology-provider call
    // to every message. Best-effort: a provider hiccup here shouldn't break
    // chat, it should just fall back to the birth-detail-only context.
    let kundliSummary: string | undefined;
    if (birthProfile) {
      try {
        const calc = await getOrComputeKundliCalculation(birthProfile);
        kundliSummary = summarizeKundliForAi(calc);
      } catch {
        // fall through — chat still works with just summarizeBirthProfile()
      }
    }
    const birthContext = [summarizeBirthProfile(birthProfile), kundliSummary].filter(Boolean).join(" ") || undefined;

    // The credit above is already spent by this point — if generation fails
    // anyway (e.g. Gemini still down after provider.ts's own retries), that
    // must not be a paid-for-nothing loss for the user. Found live: a
    // transient Gemini 503 crashed the whole request with no retry AND no
    // refund, silently costing a real question. Refund runs before
    // re-throwing, and a specific ai_unavailable error (vs a generic
    // internal_error) lets the client say something clearer than "try
    // again" with no context.
    let result;
    try {
      result = await generateAstrologyReply({
        userId: user.id,
        locale: chat.locale as AppLocale,
        history: chat.messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        userMessage: parsed.data.content,
        userImage: parsed.data.image,
        birthContext,
        feature: "chat",
        includeFollowUp: true,
        // Tone/identity flavor only (see src/lib/personas/catalog.ts's header
        // comment) — real-chart grounding above is completely unaffected by
        // which persona (if any) this chat uses.
        personaFlavor: getPersona(chat.personaCode)?.systemFlavor,
      });
    } catch (err) {
      await refundQuestionCredit(user.id, usedFree, `chat:${chatId}`);
      // Otherwise this user message sits in the chat forever with no reply
      // and no way to retry it specifically — deleting it means a retry just
      // looks like sending the question again, not a visible extra row.
      await prisma.message.delete({ where: { id: userMsg.id } }).catch(() => {});
      console.error("[chat/messages] AI generation failed, credit refunded", err);
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    const assistantMsg = await prisma.message.create({
      data: {
        chatId,
        role: "assistant",
        content: result.text,
        locale: chat.locale,
        disclosureShown: true,
      },
    });

    if (result.safetyCategory !== "none") {
      await prisma.safetyFlag.create({
        data: {
          messageId: result.wasRedirected ? assistantMsg.id : assistantMsg.id,
          category: result.safetyCategory,
          severity: result.wasRedirected ? "high" : "low",
        },
      });
    }

    if (chat.title === "New chat") {
      const title = parsed.data.content.trim().slice(0, 60) || (parsed.data.image ? "📷 Image" : "New chat");
      await prisma.chat.update({
        where: { id: chatId },
        data: { title, updatedAt: new Date() },
      });
    } else {
      await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
    }

    // Sensitive prompt content is never written to application logs — only a
    // redacted preview would ever be, and only at debug level if needed.
    void redactForLogs(parsed.data.content);

    return NextResponse.json({ userMessage: userMsg, assistantMessage: assistantMsg, followUpQuestion: result.followUpQuestion });
  } catch (err) {
    return errorResponse(err);
  }
}
