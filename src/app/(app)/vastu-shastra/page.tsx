"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Home } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { AiMarkdown } from "@/components/ui/ai-markdown";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";
import { VASTU_DIRECTIONS, VASTU_ELEMENTS, type VastuDirection, type VastuElement } from "@/lib/vastu/catalog";

const NOT_SET = "not_set";

export default function VastuShastraPage() {
  const t = useT();
  const { toast } = useToast();
  const [propertyType, setPropertyType] = useState<"home" | "office" | "shop">("home");
  const [mainDoorDirection, setMainDoorDirection] = useState<VastuDirection>("N");
  const [elementDirections, setElementDirections] = useState<Record<VastuElement, string>>(
    Object.fromEntries(VASTU_ELEMENTS.map((e) => [e.value, NOT_SET])) as Record<VastuElement, string>
  );
  const [concern, setConcern] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);

  const generate = useMutation({
    mutationFn: () => {
      const elements = (Object.entries(elementDirections) as [VastuElement, string][])
        .filter(([, direction]) => direction !== NOT_SET)
        .map(([element, direction]) => ({ element, direction }));
      return apiFetch<{ text: string }>("/api/vastu-shastra", {
        method: "POST",
        body: JSON.stringify({ propertyType, mainDoorDirection, elements, concern: concern.trim() || undefined }),
      });
    },
    onSuccess: (res) => setResult(res.text),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) setOutOfCreditsOpen(true);
      else toast({ title: t("errors.generic"), variant: "danger" });
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold">
        <Home size={22} className="text-primary" /> {t("vastuShastra.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("vastuShastra.subtitle")}</p>

      <Card className="mt-5">
        <CardContent className="flex flex-col gap-4 pt-5">
          <div>
            <Label className="mb-1.5 block text-xs">{t("vastuShastra.propertyTypeLabel")}</Label>
            <Select value={propertyType} onValueChange={(v) => setPropertyType(v as typeof propertyType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="home">{t("vastuShastra.propertyType.home")}</SelectItem>
                <SelectItem value="office">{t("vastuShastra.propertyType.office")}</SelectItem>
                <SelectItem value="shop">{t("vastuShastra.propertyType.shop")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">{t("vastuShastra.mainDoorLabel")}</Label>
            <Select value={mainDoorDirection} onValueChange={(v) => setMainDoorDirection(v as VastuDirection)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VASTU_DIRECTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("vastuShastra.otherElementsHint")}</p>

          {VASTU_ELEMENTS.map((el) => (
            <div key={el.value}>
              <Label className="mb-1.5 block text-xs">{el.label}</Label>
              <Select
                value={elementDirections[el.value]}
                onValueChange={(v) => setElementDirections((cur) => ({ ...cur, [el.value]: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOT_SET}>{t("vastuShastra.notApplicable")}</SelectItem>
                  {VASTU_DIRECTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          <div>
            <Label className="mb-1.5 block text-xs">{t("vastuShastra.concernLabel")}</Label>
            <Textarea
              placeholder={t("vastuShastra.concernPlaceholder")}
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              className="min-h-20"
            />
          </div>

          <Button disabled={generate.isPending} onClick={() => generate.mutate()}>
            {generate.isPending ? t("vastuShastra.generating") : t("vastuShastra.generate")}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-5">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("vastuShastra.title")}</CardTitle>
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
