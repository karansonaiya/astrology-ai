"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useT } from "@/lib/i18n/provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiError } from "@/lib/api-client";

// Mirrors OTP_REQUEST_COOLDOWN_SECONDS's default in .env(.example) — the
// server is the source of truth (a "cooldown" error response carries the
// exact retryAfterSeconds), this is just the optimistic UI countdown shown
// immediately after a send so the resend button doesn't sit clickable.
const RESEND_COOLDOWN_SECONDS = 45;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// E.164-ish: leading +, country code, 8-15 digits — matches otpRequestSchema
// server-side (lib/validations/auth.ts).
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

function normalizeDestination(channel: "phone" | "email", value: string): string {
  if (channel === "phone") return value.replace(/[\s-]/g, "");
  return value.trim().toLowerCase();
}

function isValidDestination(channel: "phone" | "email", normalized: string): boolean {
  return channel === "phone" ? PHONE_RE.test(normalized) : EMAIL_RE.test(normalized);
}

export default function LoginPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [consent, setConsent] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const consentOk = consent && ageConfirmed;

  // Stash a referral code from the link into a short-lived cookie so
  // /api/onboarding can link it once the account is actually created.
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) document.cookie = `jyoti_ref=${ref}; path=/; max-age=86400; SameSite=Lax`;
  }, [searchParams]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("auth.loginTitle")}</CardTitle>
        <CardDescription>{t("auth.loginSub")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="phone">
          <TabsList className="w-full">
            <TabsTrigger value="phone" className="flex-1">{t("auth.continueWithPhone")}</TabsTrigger>
            <TabsTrigger value="email" className="flex-1">{t("auth.continueWithEmail")}</TabsTrigger>
          </TabsList>
          <TabsContent value="phone">
            <OtpFlow channel="phone" consentOk={consentOk} callbackUrl={callbackUrl} />
          </TabsContent>
          <TabsContent value="email">
            <OtpFlow channel="email" consentOk={consentOk} callbackUrl={callbackUrl} />
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5">
          <label className="flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              {t("auth.agreeTermsPrefix")}{" "}
              <Link href="/terms" className="underline">{t("auth.termsLink")}</Link> {t("auth.and")}{" "}
              <Link href="/privacy" className="underline">{t("auth.privacyLink")}</Link>
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" className="mt-0.5" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} />
            <span>{t("auth.ageConfirm")}</span>
          </label>
          {!consentOk && <p className="text-xs text-muted">{t("common.required")}</p>}
        </div>
      </CardContent>
      <CardFooter className="justify-center text-xs text-muted">
        <button
          className="underline disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!consentOk}
          onClick={() => {
            if (!consentOk) return;
            signIn("google", { callbackUrl });
          }}
        >
          {t("auth.continueWithGoogle")}
        </button>
      </CardFooter>
    </Card>
  );
}

// Server-side codes from lib/auth/otp.ts's VerifyOtpResult["reason"], plus
// "invalid_request" / "account_suspended" / "account_deleted" thrown by
// auth.ts's OtpSignInError — forwarded to the client via NextAuth's
// CredentialsSignin.code (see auth.ts for how that plumbing works).
const OTP_ERROR_KEYS: Record<string, string> = {
  incorrect_code: "auth.otpErrorIncorrectCode",
  expired: "auth.otpErrorExpired",
  too_many_attempts: "auth.otpErrorTooManyAttempts",
  not_found: "auth.otpErrorNotFound",
  account_suspended: "auth.otpErrorAccountSuspended",
  account_deleted: "auth.otpErrorAccountDeleted",
  invalid_request: "errors.generic",
};

function OtpFlow({ channel, consentOk, callbackUrl }: { channel: "phone" | "email"; consentOk: boolean; callbackUrl: string }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();

  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const lastAutoSubmitted = useRef<string | null>(null);

  // Countdown tick for the resend cooldown.
  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => {
      const secs = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownRemaining(secs);
      if (secs <= 0) setCooldownUntil(null);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const normalized = normalizeDestination(channel, destination);
  const destinationValid = isValidDestination(channel, normalized);

  const sendOtp = async () => {
    if (!consentOk || !normalized) return;
    if (!destinationValid) {
      setDestinationError(channel === "phone" ? t("auth.invalidPhoneFormat") : t("auth.invalidEmailFormat"));
      return;
    }
    setDestinationError(null);
    setCodeError(null);
    setSending(true);
    try {
      const res = await apiFetch<{ ok: boolean; devCode?: string }>("/api/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ destination: normalized, channel }),
      });
      setSent(true);
      setCode("");
      lastAutoSubmitted.current = null;
      setDevCode(res.devCode ?? null);
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      toast({ title: t("auth.otpSentNotice"), variant: "success" });
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string; retryAfterSeconds?: number } | null;
        if (body?.error === "cooldown" && body.retryAfterSeconds) {
          setCooldownUntil(Date.now() + body.retryAfterSeconds * 1000);
          toast({ title: t("auth.otpCooldownWait", { seconds: body.retryAfterSeconds }), variant: "danger" });
        } else if (body?.error === "rate_limited") {
          toast({ title: t("errors.rateLimited"), variant: "danger" });
        } else if (body?.error === "invalid_request") {
          setDestinationError(channel === "phone" ? t("auth.invalidPhoneFormat") : t("auth.invalidEmailFormat"));
        } else {
          toast({ title: t("errors.generic"), variant: "danger" });
        }
      } else {
        toast({ title: t("errors.network"), variant: "danger" });
      }
    } finally {
      setSending(false);
    }
  };

  const verify = async (candidate?: string) => {
    const codeToVerify = candidate ?? code;
    if (codeToVerify.length !== 6 || verifying) return;
    setCodeError(null);
    setVerifying(true);
    const res = await signIn("otp", { destination: normalized, channel, code: codeToVerify, redirect: false });
    setVerifying(false);
    if (res?.error) {
      const key = res.code ? OTP_ERROR_KEYS[res.code] : undefined;
      setCodeError(key ? t(key) : t("errors.generic"));
      setCode("");
      lastAutoSubmitted.current = null;
      return;
    }
    router.push(callbackUrl);
  };

  // Auto-submit once a full 6-digit code is typed/pasted — a standard OTP-UX
  // pattern — but only once per distinct value so a failed attempt doesn't
  // re-fire on every keystroke while the (now-cleared) field refills.
  useEffect(() => {
    if (code.length === 6 && lastAutoSubmitted.current !== code) {
      lastAutoSubmitted.current = code;
      verify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const editDestination = () => {
    setSent(false);
    setCode("");
    setCodeError(null);
    setDevCode(null);
    lastAutoSubmitted.current = null;
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <Label htmlFor="destination">{channel === "phone" ? t("auth.phoneLabel") : t("auth.emailLabel")}</Label>
        <Input
          id="destination"
          type={channel === "phone" ? "tel" : "email"}
          placeholder={channel === "phone" ? "+91 9XXXXXXXXX" : "you@example.com"}
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value);
            if (destinationError) setDestinationError(null);
          }}
          className="mt-1.5"
          disabled={sent}
        />
        {destinationError && <p className="mt-1.5 text-xs text-danger">{destinationError}</p>}
      </div>

      {!sent ? (
        <Button onClick={sendOtp} disabled={!consentOk || !destination || sending}>
          {t("auth.sendOtp")}
        </Button>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{normalized}</span>
            <button type="button" className="text-xs text-muted underline" onClick={editDestination}>
              {t("auth.editDestination")}
            </button>
          </div>
          <div>
            <Label htmlFor="code">{t("auth.otpLabel")}</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (codeError) setCodeError(null);
              }}
              className="mt-1.5 tracking-[0.3em]"
              disabled={verifying}
            />
            {codeError && <p className="mt-2 text-xs text-danger">{codeError}</p>}
            {devCode && (
              <p className="mt-2 text-xs text-gold">
                {t("auth.devOtpNotice")} <strong>{devCode}</strong>
              </p>
            )}
          </div>
          <Button onClick={() => verify()} disabled={code.length !== 6 || verifying}>
            {t("auth.verifyOtp")}
          </Button>
          <button
            type="button"
            className="text-xs text-muted underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
            onClick={sendOtp}
            disabled={sending || cooldownRemaining > 0}
          >
            {cooldownRemaining > 0 ? t("auth.resendIn", { seconds: cooldownRemaining }) : t("auth.resendOtp")}
          </button>
        </>
      )}
    </div>
  );
}
