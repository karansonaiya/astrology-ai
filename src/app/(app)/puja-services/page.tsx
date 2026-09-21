"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { AiMarkdown } from "@/components/ui/ai-markdown";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";
import { PUJA_CATALOG } from "@/lib/puja/catalog";

const CUSTOM = "custom";

type PujaRequest = {
  id: string;
  pujaName: string;
  preferredDate: string | null;
  contactPhone: string;
  notes: string | null;
  status: string;
  createdAt: string;
};

export default function PujaServicesPage() {
  const t = useT();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [concern, setConcern] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);

  const [pujaCode, setPujaCode] = useState<string>(CUSTOM);
  const [customPujaName, setCustomPujaName] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");

  const generate = useMutation({
    mutationFn: () => apiFetch<{ text: string }>("/api/puja-services", { method: "POST", body: JSON.stringify({ concern }) }),
    onSuccess: (res) => setResult(res.text),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) setOutOfCreditsOpen(true);
      else toast({ title: t("errors.generic"), variant: "danger" });
    },
  });

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ["puja-requests"],
    queryFn: () => apiFetch<{ requests: PujaRequest[] }>("/api/puja-services/requests"),
  });

  const selectedPuja = PUJA_CATALOG.find((p) => p.code === pujaCode);
  const requestBooking = useMutation({
    mutationFn: () =>
      apiFetch("/api/puja-services/requests", {
        method: "POST",
        body: JSON.stringify({
          pujaCode: pujaCode === CUSTOM ? undefined : pujaCode,
          pujaName: pujaCode === CUSTOM ? customPujaName.trim() : selectedPuja?.name ?? "",
          preferredDate: preferredDate || undefined,
          contactPhone: contactPhone.trim(),
          notes: notes.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      toast({ title: t("pujaServices.requestSentNotice"), variant: "success" });
      setCustomPujaName("");
      setPreferredDate("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["puja-requests"] });
    },
    onError: () => toast({ title: t("errors.generic"), variant: "danger" }),
  });

  const bookingValid = contactPhone.trim().length >= 4 && (pujaCode !== CUSTOM || customPujaName.trim().length > 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold">
        <Flame size={22} className="text-primary" /> {t("pujaServices.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("pujaServices.subtitle")}</p>

      <Card className="mt-5">
        <CardHeader><CardTitle className="text-base">{t("pujaServices.guidanceTitle")}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Textarea
            placeholder={t("pujaServices.concernPlaceholder")}
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            className="min-h-24"
          />
          <Button disabled={concern.length < 5 || generate.isPending} onClick={() => generate.mutate()}>
            {generate.isPending ? t("pujaServices.generating") : t("pujaServices.getGuidance")}
          </Button>
          {result && (
            <div className="mt-2 rounded-xl border border-gold/30 bg-gold/5 p-4">
              <div className="mb-2"><AiDisclosureBadge label={t("common.aiGuidanceBadge")} /></div>
              <AiMarkdown content={result} className="text-foreground/90" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader><CardTitle className="text-base">{t("pujaServices.requestTitle")}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted">{t("pujaServices.requestNotice")}</p>
          <div>
            <Label className="mb-1.5 block text-xs">{t("pujaServices.selectPujaLabel")}</Label>
            <Select value={pujaCode} onValueChange={setPujaCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={CUSTOM}>{t("pujaServices.customPuja")}</SelectItem>
                {PUJA_CATALOG.map((p) => (
                  <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {pujaCode === CUSTOM && (
            <div>
              <Label className="mb-1.5 block text-xs">{t("pujaServices.customPujaNameLabel")}</Label>
              <Input value={customPujaName} onChange={(e) => setCustomPujaName(e.target.value)} />
            </div>
          )}
          <div>
            <Label className="mb-1.5 block text-xs">{t("pujaServices.preferredDateLabel")}</Label>
            <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">{t("pujaServices.contactPhoneLabel")}</Label>
            <Input type="tel" placeholder="+91 9XXXXXXXXX" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">{t("common.optional")}: {t("pujaServices.notesLabel")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-16" />
          </div>
          <Button disabled={!bookingValid || requestBooking.isPending} onClick={() => requestBooking.mutate()}>
            {t("pujaServices.sendRequest")}
          </Button>
        </CardContent>
      </Card>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">{t("pujaServices.yourRequestsTitle")}</h2>
      <div className="mt-3 flex flex-col gap-3">
        {requestsLoading && <Skeleton className="h-20" />}
        {!requestsLoading && requestsData?.requests.length === 0 && (
          <p className="py-4 text-center text-sm text-muted">{t("pujaServices.noRequests")}</p>
        )}
        {requestsData?.requests.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium">{r.pujaName}</p>
                <p className="text-xs text-muted">{formatDateTime(r.createdAt)}</p>
              </div>
              <Badge variant={r.status === "completed" ? "success" : r.status === "cancelled" ? "danger" : "default"}>{r.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <OutOfCreditsDialog open={outOfCreditsOpen} onOpenChange={setOutOfCreditsOpen} />
    </div>
  );
}
