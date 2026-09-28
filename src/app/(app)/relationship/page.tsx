"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { AiMarkdown } from "@/components/ui/ai-markdown";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";
import { PageHeader } from "@/components/app/page-header";

export default function RelationshipPage() {
  const t = useT();
  const { toast } = useToast();
  const [situation, setSituation] = useState("");
  const [situationError, setSituationError] = useState<string | null>(null);
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

  const handleSubmit = () => {
    if (situation.trim().length < 5) {
      setSituationError(t("relationship.situationTooShort"));
      return;
    }
    setSituationError(null);
    generate.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <PageHeader icon={Heart} title={t("relationship.title")} subtitle={t("relationship.supportNotice")} />

      <Card className="mt-5">
        <CardContent className="flex flex-col gap-4 pt-5">
          <div>
            <Textarea
              placeholder={t("relationship.situationLabel")}
              value={situation}
              onChange={(e) => {
                setSituation(e.target.value);
                if (situationError) setSituationError(null);
              }}
              className={situationError ? "min-h-32 border-danger" : "min-h-32"}
            />
            {situationError && <p className="mt-1.5 text-xs text-danger">{situationError}</p>}
          </div>
          <Button disabled={generate.isPending} onClick={handleSubmit}>
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
