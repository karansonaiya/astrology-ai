import { NextRequest, NextResponse } from "next/server";
import { otpRequestSchema } from "@/lib/validations/auth";
import { issueOtp, OtpCooldownError } from "@/lib/auth/otp";
import { getSmsProvider } from "@/lib/notify/sms";
import { getEmailProvider } from "@/lib/notify/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  const ipLimit = await rateLimit("otp-request-ip", ip, 10, 600);
  if (!ipLimit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = otpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { destination, channel } = parsed.data;

  const destLimit = await rateLimit("otp-request-dest", destination, 5, 600);
  if (!destLimit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const { code, expiresInSeconds } = await issueOtp({
      destination,
      channel,
      purpose: "login",
      requestIp: ip,
    });

    if (channel === "phone") {
      await getSmsProvider().sendOtp(destination, code);
    } else {
      await getEmailProvider().send(destination, "Your Prerna AI verification code", `Your code is ${code}.`);
    }

    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({
      ok: true,
      expiresInSeconds,
      // Only ever surface the raw code outside production, and only when no
      // real provider is configured — never leak OTP codes in production logs/responses.
      devCode: isDev && process.env.OTP_PROVIDER !== "twilio" && process.env.OTP_PROVIDER !== "msg91" ? code : undefined,
    });
  } catch (err) {
    if (err instanceof OtpCooldownError) {
      return NextResponse.json({ error: "cooldown", retryAfterSeconds: err.retryAfterSeconds }, { status: 429 });
    }
    console.error("[otp/request] failed", err);
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
}
