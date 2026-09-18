"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useT } from "@/lib/i18n/provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiError } from "@/lib/api-client";

const RESEND_COOLDOWN_SECONDS = 45;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Server-side codes from otp.ts's VerifyOtpResult["reason"] (via the confirm
// route) plus "invalid_request"/account_* — same shape as login/page.tsx's
// OTP_ERROR_KEYS, reused here for the equivalent code-verification step.
const CODE_ERROR_KEYS: Record<string, string> = {
  incorrect_code: "auth.otpErrorIncorrectCode",
  expired: "auth.otpErrorExpired",
  too_many_attempts: "auth.otpErrorTooManyAttempts",
  not_found: "auth.otpErrorNotFound",
  account_suspended: "auth.accountSuspended",
  account_deleted: "auth.accountDeleted",
  invalid_request: "errors.generic",
};

export default function ForgotPasswordPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
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

  const requestCode = async () => {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setEmailError(t("auth.invalidEmailFormat"));
      return;
    }
    setEmailError(null);
    setSending(true);
    try {
      const res = await apiFetch<{ ok: boolean; devCode?: string }>("/api/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: normalized }),
      });
      setSent(true);
      setCode("");
      lastAutoSubmitted.current = null;
      setDevCode(res.devCode ?? null);
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      toast({ title: t("auth.resetCodeSentNotice"), variant: "success" });
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string; retryAfterSeconds?: number } | null;
        if (body?.error === "cooldown" && body.retryAfterSeconds) {
          setCooldownUntil(Date.now() + body.retryAfterSeconds * 1000);
          toast({ title: t("auth.otpCooldownWait", { seconds: body.retryAfterSeconds }), variant: "danger" });
        } else if (body?.error === "rate_limited") {
          toast({ title: t("errors.rateLimited"), variant: "danger" });
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

  const confirmReset = async (candidate?: string) => {
    const codeToVerify = candidate ?? code;
    if (codeToVerify.length !== 6 || submitting) return;
    setCodeError(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError(t("auth.passwordMinHint"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("auth.passwordMismatch"));
      return;
    }

    setSubmitting(true);
    const normalized = email.trim().toLowerCase();
    try {
      await apiFetch("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ email: normalized, code: codeToVerify, newPassword }),
      });
      const res = await signIn("password", { email: normalized, password: newPassword, redirect: false });
      if (res?.error) {
        // Shouldn't happen right after a successful reset, but fall back to
        // sending them to log in manually rather than a dead end here.
        router.push("/login");
        return;
      }
      // Hard navigation — same reasoning as login/page.tsx's PasswordFlow.
      window.location.href = callbackUrl;
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string } | null;
        const key = body?.error ? CODE_ERROR_KEYS[body.error] : undefined;
        setCodeError(key ? t(key) : t("errors.generic"));
      } else {
        toast({ title: t("errors.network"), variant: "danger" });
      }
      setCode("");
      lastAutoSubmitted.current = null;
      setSubmitting(false);
    }
  };

  // Auto-submit once all three fields are valid — re-checks on every one of
  // them changing (not just `code`), so this fires regardless of fill
  // order: pasting the code last (the common case) works the same as
  // typing the passwords last.
  useEffect(() => {
    if (code.length === 6 && lastAutoSubmitted.current !== code && newPassword.length >= 8 && newPassword === confirmPassword) {
      lastAutoSubmitted.current = code;
      confirmReset(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, newPassword, confirmPassword]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("auth.forgotPasswordTitle")}</CardTitle>
        <CardDescription>{sent ? t("auth.resetPasswordSub") : t("auth.forgotPasswordSub")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!sent ? (
          <div className="flex flex-col gap-4">
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
            <Button onClick={requestCode} disabled={!email || sending}>
              {t("auth.sendResetCode")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{email.trim().toLowerCase()}</span>
              <button type="button" className="text-xs text-muted underline" onClick={() => setSent(false)}>
                {t("auth.editDestination")}
              </button>
            </div>
            <div>
              <Label htmlFor="code">{t("auth.resetCodeLabel")}</Label>
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
                disabled={submitting}
              />
              {codeError && <p className="mt-2 text-xs text-danger">{codeError}</p>}
              {devCode && (
                <p className="mt-2 text-xs text-gold">
                  {t("auth.devOtpNotice")} <strong>{devCode}</strong>
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="newPassword">{t("auth.newPasswordLabel")}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                className="mt-1.5"
              />
              <p className="mt-1.5 text-xs text-muted">{t("auth.passwordMinHint")}</p>
            </div>
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
            {passwordError && <p className="text-xs text-danger">{passwordError}</p>}
            <Button onClick={() => confirmReset()} disabled={code.length !== 6 || !newPassword || submitting}>
              {t("auth.resetPasswordButton")}
            </Button>
            <button
              type="button"
              className="text-xs text-muted underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
              onClick={requestCode}
              disabled={sending || cooldownRemaining > 0}
            >
              {cooldownRemaining > 0 ? t("auth.resendIn", { seconds: cooldownRemaining }) : t("auth.resendOtp")}
            </button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/login" className="text-xs text-muted underline">
          {t("auth.backToLogin")}
        </Link>
      </CardFooter>
    </Card>
  );
}
