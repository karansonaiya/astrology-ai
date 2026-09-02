"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { AiMarkdown } from "@/components/ui/ai-markdown";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";

export default function RelationshipPage() {
  const t = useT();
  const { toast } = useToast();
  const [situation, setSituation] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);

  const generate = useMutation({
    mutationFn: () => apiFetch<{ text: string }>("/api/relationship", { method: "POST", body: JSON.stringify({ situation }) }),
    onSuccess: (res) => setResult(res.text),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) setOutOfCreditsOpen(true);
      else toast({ title: t("errors.generic"), variant: "danger" });
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="font-heading text-2xl font-semibold">{t("relationship.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("relationship.supportNotice")}</p>

      <Card className="mt-5">
        <CardContent className="flex flex-col gap-4 pt-5">
          <Textarea
            placeholder={t("relationship.situationLabel")}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            className="min-h-32"
          />
          <Button disabled={situation.length < 5 || generate.isPending} onClick={() => generate.mutate()}>
            {t("relationship.generateInsight")}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-5">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("relationship.title")}</CardTitle>
            <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
          </CardHeader>
          <CardContent>
            <AiMarkdown content={result} className="text-foreground/90" />
          </CardContent>
        </Card>
      )}

      <OutOfCreditsDialog open={outOfCreditsOpen} onOpenChange={setOutOfCreditsOpen} />
    </div>
  );
}
