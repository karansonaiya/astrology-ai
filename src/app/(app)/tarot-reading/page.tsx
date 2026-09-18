"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Spade } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { AiMarkdown } from "@/components/ui/ai-markdown";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";

type TarotPosition = "past" | "present" | "future";
type TarotOrientation = "upright" | "reversed";
type DrawnCard = { code: string; name: string; orientation: TarotOrientation; position: TarotPosition };
type TarotReading = { id: string; question: string | null; cards: DrawnCard[]; result: { text: string } | null; createdAt: string };

const POSITIONS: TarotPosition[] = ["past", "present", "future"];

export default function TarotReadingPage() {
  const t = useT();
  const { locale } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [question, setQuestion] = useState("");
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tarot-readings"],
    queryFn: () => apiFetch<{ readings: TarotReading[] }>("/api/tarot-reading"),
  });

  const generate = useMutation({
    mutationFn: () => apiFetch("/api/tarot-reading", { method: "POST", body: JSON.stringify({ question: question.trim() || undefined }) }),
    onSuccess: () => {
      setQuestion("");
      qc.invalidateQueries({ queryKey: ["tarot-readings"] });
      qc.invalidateQueries({ queryKey: ["credits-summary"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) setOutOfCreditsOpen(true);
      else toast({ title: t("errors.generic"), variant: "danger" });
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold">
        <Spade size={22} className="text-primary" /> {t("tarot.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("tarot.subtitle")}</p>

      <Card className="mt-6">
        <CardContent className="flex flex-col gap-3 py-5">
          <div>
            <label className="mb-1.5 block text-xs text-muted">{t("tarot.questionLabel")}</label>
            <Textarea
              placeholder={t("tarot.questionPlaceholder")}
              value={question}
              maxLength={500}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <Button className="w-fit" disabled={generate.isPending} onClick={() => generate.mutate()}>
            <Spade size={16} />
            {generate.isPending ? t("tarot.drawing") : t("tarot.drawCards")}
          </Button>
        </CardContent>
      </Card>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">{t("tarot.historyTitle")}</h2>
      <div className="mt-3 flex flex-col gap-4">
        {isLoading && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        {!isLoading && data?.readings.length === 0 && <p className="py-6 text-center text-sm text-muted">{t("tarot.noHistory")}</p>}
        {data?.readings.map((reading) => (
          <Card key={reading.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm text-muted">{formatDateTime(reading.createdAt, `${locale}-IN`)}</CardTitle>
              <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {reading.question && <p className="text-sm italic text-foreground/80">&ldquo;{reading.question}&rdquo;</p>}
              <div className="grid grid-cols-3 gap-2">
                {POSITIONS.map((pos) => {
                  const drawn = reading.cards.find((c) => c.position === pos);
                  if (!drawn) return null;
                  return (
                    <div key={pos} className="rounded-lg border border-border bg-surface-raised p-2 text-center">
                      <p className="text-[11px] uppercase tracking-wide text-muted">{t(`tarot.position.${pos}`)}</p>
                      <p className="mt-1 text-sm font-medium">{drawn.name}</p>
                      <Badge variant={drawn.orientation === "reversed" ? "gold" : "default"} className="mt-1">
                        {t(`tarot.orientation.${drawn.orientation}`)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              {reading.result?.text && <AiMarkdown content={reading.result.text} className="text-foreground/90" />}
            </CardContent>
          </Card>
        ))}
      </div>

      <OutOfCreditsDialog open={outOfCreditsOpen} onOpenChange={setOutOfCreditsOpen} />
    </div>
  );
}
