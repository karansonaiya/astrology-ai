"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ReferralData = { referralCode: string; totalReferred: number; creditsEarned: number };

export default function ReferralPage() {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const { data } = useQuery({ queryKey: ["referral"], queryFn: () => apiFetch<ReferralData>("/api/referral") });

  const link = typeof window !== "undefined" && data ? `${window.location.origin}/login?ref=${data.referralCode}` : "";

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="font-heading text-2xl font-semibold">{t("referral.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("referral.howItWorks")}</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t("referral.yourCode")}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input readOnly value={link} />
          <Button variant="outline" onClick={copy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? t("common.copied") : t("common.copy")}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-2xl font-semibold">{data?.totalReferred ?? 0}</p>
            <p className="text-xs text-muted">{t("referral.totalReferred")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-2xl font-semibold">{data?.creditsEarned ?? 0}</p>
            <p className="text-xs text-muted">{t("referral.creditsEarned")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
