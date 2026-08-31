"use client";

import { useEffect, useState } from "react";
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
          {!consentOk && <p className="text-xs text-danger">{t("common.required")}</p>}
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

function OtpFlow({ channel, consentOk, callbackUrl }: { channel: "phone" | "email"; consentOk: boolean; callbackUrl: string }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();

  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!consentOk || !destination) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; devCode?: string }>("/api/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ destination, channel }),
      });
      setSent(true);
      setDevCode(res.devCode ?? null);
      toast({ title: t("auth.otpSentNotice"), variant: "success" });
    } catch (err) {
      const message = err instanceof ApiError ? String((err.body as { error?: string })?.error ?? "") : "";
      toast({ title: t("errors.generic"), description: message, variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    const res = await signIn("otp", { destination, channel, code, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast({ title: t("errors.generic"), variant: "danger" });
      return;
    }
    router.push(callbackUrl);
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
          onChange={(e) => setDestination(e.target.value)}
          className="mt-1.5"
          disabled={sent}
        />
      </div>

      {!sent ? (
        <Button onClick={sendOtp} disabled={!consentOk || !destination || loading}>
          {t("auth.sendOtp")}
        </Button>
      ) : (
        <>
          <div>
            <Label htmlFor="code">{t("auth.otpLabel")}</Label>
            <Input
              id="code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1.5 tracking-[0.3em]"
            />
            {devCode && (
              <p className="mt-2 text-xs text-gold">
                {t("auth.devOtpNotice")} <strong>{devCode}</strong>
              </p>
            )}
          </div>
          <Button onClick={verify} disabled={code.length !== 6 || loading}>
            {t("auth.verifyOtp")}
          </Button>
          <button className="text-xs text-muted underline" onClick={sendOtp} disabled={loading}>
            {t("auth.resendOtp")}
          </button>
        </>
      )}
    </div>
  );
}
