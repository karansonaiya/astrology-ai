/**
 * CAPTCHA verification — protects public, unauthenticated AI/action
 * endpoints (currently /api/public/ask) from bot abuse. Same
 * mock/real-provider spirit as the rest of the app: CAPTCHA_PROVIDER="none"
 * (default) verifies everything (zero-config dev), set it to "turnstile"
 * (recommended — free, privacy-friendly, has a client widget wired up at
 * src/components/ui/captcha-widget.tsx) or "hcaptcha" for production.
 *
 * Note: only Turnstile's client widget + CSP allowances are wired up (see
 * middleware.ts). hCaptcha's siteverify call below works, but its widget
 * script/frame domains aren't in the CSP yet — add
 * https://js.hcaptcha.com / https://newassets.hcaptcha.com there too if you
 * actually switch to it.
 */
export async function verifyCaptcha(token: string | undefined | null): Promise<boolean> {
  const provider = process.env.CAPTCHA_PROVIDER ?? "none";
  if (provider === "none") return true;
  if (!token) return false;

  const secret = process.env.CAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error("[captcha] CAPTCHA_PROVIDER is set but CAPTCHA_SECRET_KEY is missing — failing closed");
    return false;
  }

  const verifyUrl =
    provider === "turnstile"
      ? "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      : "https://hcaptcha.com/siteverify";

  try {
    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[captcha] verification request failed:", err);
    return false; // fail closed — an outage shouldn't open the door to abuse
  }
}
