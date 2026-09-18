"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useT } from "@/lib/i18n/provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiError } from "@/lib/api-client";
// PAUSED 2026-09-18 — see auth.ts's matching comment for why, and for how
// to bring OTP back. This import (and the OtpFlow function it powered,
// commented out at the bottom of this file) is what the OTP tabs UI used.
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Google's own 4-color "G" brand mark — standard asset, matches Google's sign-in button guidelines. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

export default function LoginPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [consent, setConsent] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const consentOk = consent && ageConfirmed;
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Stash a referral code from the link into a short-lived cookie so
  // /api/onboarding can link it once the account is actually created.
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) document.cookie = `prerna_ref=${ref}; path=/; max-age=86400; SameSite=Lax`;
  }, [searchParams]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}</CardTitle>
        <CardDescription>{mode === "login" ? t("auth.loginSub") : t("auth.signupSub")}</CardDescription>
      </CardHeader>
      <CardContent>
        <PasswordFlow mode={mode} consentOk={consentOk} callbackUrl={callbackUrl} />

        <p className="mt-4 text-center text-xs text-muted">
          {mode === "login" ? t("auth.needAccountPrompt") : t("auth.haveAccountPrompt")}{" "}
          <button
            type="button"
            className="font-medium text-foreground underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? t("auth.switchToSignup") : t("auth.switchToLogin")}
          </button>
        </p>

        {mode === "login" && (
          <p className="mt-2 text-center text-xs">
            <Link href="/forgot-password" className="text-muted underline">
              {t("auth.forgotPasswordLink")}
            </Link>
          </p>
        )}

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
      <CardFooter className="flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!consentOk}
          onClick={() => {
            if (!consentOk) return;
            signIn("google", { callbackUrl });
          }}
        >
          <GoogleIcon />
          {t("auth.continueWithGoogle")}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Server-side codes from auth.ts's "password" provider's PasswordSignInError,
// plus "invalid_request" for a malformed submit.
const PASSWORD_ERROR_KEYS: Record<string, string> = {
  invalid_request: "errors.generic",
  invalid_credentials: "auth.invalidCredentials",
  account_suspended: "auth.accountSuspended",
  account_deleted: "auth.accountDeleted",
};

function PasswordFlow({ mode, consentOk, callbackUrl }: { mode: "login" | "signup"; consentOk: boolean; callbackUrl: string }) {
  const t = useT();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setEmailError(null);
    setPasswordError(null);

    if (!EMAIL_RE.test(normalizedEmail)) {
      setEmailError(t("auth.invalidEmailFormat"));
      return;
    }
    if (mode === "signup") {
      if (password.length < 8) {
        setPasswordError(t("auth.passwordMinHint"));
        return;
      }
      if (password !== confirmPassword) {
        setPasswordError(t("auth.passwordMismatch"));
        return;
      }
    }
    if (!consentOk) return;

    setSubmitting(true);
    try {
      if (mode === "signup") {
        await apiFetch("/api/auth/signup", { method: "POST", body: JSON.stringify({ email: normalizedEmail, password }) });
      }
      const res = await signIn("password", { email: normalizedEmail, password, redirect: false });
      if (res?.error) {
        const key = res.code ? PASSWORD_ERROR_KEYS[res.code] : undefined;
        setPasswordError(key ? t(key) : t("errors.generic"));
        setSubmitting(false);
        return;
      }
      // Hard navigation, not router.push — the same fix the paused OTP flow
      // used (see auth.ts's comment / git history): a client-side
      // transition right after signIn(..., {redirect:false}) sets the
      // session cookie, but next-auth's client SessionProvider and the
      // server-side auth() read in (app)/layout.tsx don't reliably both
      // pick up the brand-new session before rendering, which could land on
      // a stale/blank dashboard. A full page load re-fetches everything
      // against the now-real cookie.
      window.location.href = callbackUrl;
    } catch (err) {
      if (mode === "signup" && err instanceof ApiError && (err.body as { error?: string } | null)?.error === "email_taken") {
        setEmailError(t("auth.emailTaken"));
      } else {
        toast({ title: t("errors.generic"), variant: "danger" });
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <Label htmlFor="email">{t("auth.emailLabel")}</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          className="mt-1.5"
        />
        {emailError && <p className="mt-1.5 text-xs text-danger">{emailError}</p>}
      </div>
      <div>
        <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError(null);
          }}
          className="mt-1.5"
        />
        {mode === "signup" && <p className="mt-1.5 text-xs text-muted">{t("auth.passwordMinHint")}</p>}
      </div>
      {mode === "signup" && (
        <div>
          <Label htmlFor="confirmPassword">{t("auth.confirmPasswordLabel")}</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            className="mt-1.5"
          />
        </div>
      )}
      {passwordError && <p className="text-xs text-danger">{passwordError}</p>}
      <Button onClick={submit} disabled={!consentOk || !email || !password || submitting}>
        {mode === "login" ? t("auth.signInButton") : t("auth.signUpButton")}
      </Button>
    </div>
  );
}

/* PAUSED 2026-09-18 — phone/email OTP login+signup, replaced above by
   PasswordFlow. See auth.ts's matching "PAUSED" comment for why and for the
   paused Credentials provider this UI called. Kept complete so re-enabling
   is: uncomment this, uncomment the Tabs import at the top, uncomment the
   Credentials({id: "otp", ...}) block in auth.ts, and swap the JSX in
   LoginPage's CardContent back to the <Tabs>/<OtpFlow> pair this replaced.

const RESEND_COOLDOWN_SECONDS = 45;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

function normalizeDestination(channel: "phone" | "email", value: string): string {
  if (channel === "phone") return value.replace(/[\s-]/g, "");
  return value.trim().toLowerCase();
}

function isValidDestination(channel: "phone" | "email", normalized: string): boolean {
  return channel === "phone" ? PHONE_RE.test(normalized) : EMAIL_RE.test(normalized);
}

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
    window.location.href = callbackUrl;
  };

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
*/
