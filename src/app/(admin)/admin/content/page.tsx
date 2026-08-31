"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ZODIAC_SIGNS } from "@/lib/zodiac";

type Content = {
  id: string; zodiacSign: string; period: string; locale: string; periodDate: string; status: string;
  career: string; love: string; money: string; wellness: string; luckyColor: string; luckyNumber: string; reflection: string;
};

const EMPTY_FORM = {
  zodiacSign: "aries", period: "daily", locale: "en", periodDate: new Date().toISOString().slice(0, 10),
  career: "", love: "", money: "", wellness: "", luckyColor: "", luckyNumber: "", reflection: "",
};

type GenerateResult = { created: string[]; skipped: string[]; failed: { sign: string; error: string }[] };
type GenerateResponse = { results: Record<string, GenerateResult> };

export default function AdminContentPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [genForm, setGenForm] = useState({
    period: "daily",
    periodDate: new Date().toISOString().slice(0, 10),
  });

  const { data, isLoading } = useQuery({ queryKey: ["admin-content"], queryFn: () => apiFetch<{ content: Content[] }>("/api/admin/content/horoscope") });

  const generate = useMutation({
    mutationFn: () => apiFetch<GenerateResponse>("/api/admin/content/horoscope/generate", { method: "POST", body: JSON.stringify(genForm) }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-content"] });
      const locales = Object.keys(res.results);
      const totalCreated = locales.reduce((n, l) => n + res.results[l].created.length, 0);
      const totalSkipped = locales.reduce((n, l) => n + res.results[l].skipped.length, 0);
      const totalFailed = locales.reduce((n, l) => n + res.results[l].failed.length, 0);
      const parts = [
        totalCreated ? `${totalCreated} draft(s) created (en+hi+gu)` : null,
        totalSkipped ? `${totalSkipped} already existed` : null,
        totalFailed ? `${totalFailed} failed` : null,
      ].filter(Boolean);
      toast({ title: parts.join(" · ") || "Nothing to generate", variant: totalFailed ? "danger" : "success" });
    },
    onError: () => toast({ title: "Generation failed", variant: "danger" }),
  });

  const create = useMutation({
    mutationFn: () => apiFetch("/api/admin/content/horoscope", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content"] });
      setForm(EMPTY_FORM);
      toast({ title: "Draft created", variant: "success" });
    },
  });

  const publish = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/content/horoscope/${id}`, { method: "PATCH", body: JSON.stringify({ status: "published" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-content"] }),
  });

  const publishAllDrafts = useMutation({
    mutationFn: async () => {
      const drafts = (data?.content ?? []).filter((c) => c.status !== "published");
      for (const d of drafts) {
        await apiFetch(`/api/admin/content/horoscope/${d.id}`, { method: "PATCH", body: JSON.stringify({ status: "published" }) });
      }
      return drafts.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["admin-content"] });
      toast({ title: `Published ${count} draft(s)`, variant: "success" });
    },
  });

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Horoscope Content</h1>

      <Card className="mt-4 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles size={16} className="text-primary" /> Generate with AI
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Select value={genForm.period} onValueChange={(v) => setGenForm((f) => ({ ...f, period: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">daily</SelectItem>
              <SelectItem value="weekly">weekly</SelectItem>
              <SelectItem value="monthly">monthly</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={genForm.periodDate} onChange={(e) => setGenForm((f) => ({ ...f, periodDate: e.target.value }))} />
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? "Generating (en+hi+gu)…" : "Generate all 12 signs · all 3 languages"}
          </Button>
        </CardContent>
        <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-0 text-xs text-muted">
          <span>
            Creates one <strong>draft</strong> per sign, in <strong>English + Hindi + Gujarati together</strong> (skips
            combos that already have content) — nothing goes live automatically.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => publishAllDrafts.mutate()}
            disabled={publishAllDrafts.isPending || !data?.content.some((c) => c.status !== "published")}
          >
            Publish all drafts shown below
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">New draft</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Select value={form.zodiacSign} onValueChange={(v) => setForm((f) => ({ ...f, zodiacSign: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ZODIAC_SIGNS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.period} onValueChange={(v) => setForm((f) => ({ ...f, period: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">daily</SelectItem>
              <SelectItem value="weekly">weekly</SelectItem>
              <SelectItem value="monthly">monthly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={form.locale} onValueChange={(v) => setForm((f) => ({ ...f, locale: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">en</SelectItem>
              <SelectItem value="hi">hi</SelectItem>
              <SelectItem value="gu">gu</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={form.periodDate} onChange={(e) => setForm((f) => ({ ...f, periodDate: e.target.value }))} />
          <Input placeholder="Lucky color" value={form.luckyColor} onChange={(e) => setForm((f) => ({ ...f, luckyColor: e.target.value }))} />
          <Input placeholder="Lucky number" value={form.luckyNumber} onChange={(e) => setForm((f) => ({ ...f, luckyNumber: e.target.value }))} />
          <Textarea className="sm:col-span-3" placeholder="Career" value={form.career} onChange={(e) => setForm((f) => ({ ...f, career: e.target.value }))} />
          <Textarea className="sm:col-span-3" placeholder="Love" value={form.love} onChange={(e) => setForm((f) => ({ ...f, love: e.target.value }))} />
          <Textarea className="sm:col-span-3" placeholder="Money" value={form.money} onChange={(e) => setForm((f) => ({ ...f, money: e.target.value }))} />
          <Textarea className="sm:col-span-3" placeholder="Wellness" value={form.wellness} onChange={(e) => setForm((f) => ({ ...f, wellness: e.target.value }))} />
          <Textarea className="sm:col-span-3" placeholder="Reflection" value={form.reflection} onChange={(e) => setForm((f) => ({ ...f, reflection: e.target.value }))} />
          <Button
            className="sm:col-span-3"
            disabled={!form.career || !form.love || !form.money || !form.wellness || !form.reflection || create.isPending}
            onClick={() => create.mutate()}
          >
            Save as draft
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="mt-4 h-64" />
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {data?.content.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between py-3">
                <span className="text-sm">
                  {c.zodiacSign} · {c.period} · {c.locale} · {formatDate(c.periodDate)}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === "published" ? "success" : "default"}>{c.status}</Badge>
                  {c.status !== "published" && (
                    <Button size="sm" onClick={() => publish.mutate(c.id)}>Publish</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
