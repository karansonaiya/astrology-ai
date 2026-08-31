"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  updatedAt: string;
  replies: { id: string; message: string; createdAt: string }[];
};

export default function HelpPage() {
  const t = useT();
  const { locale } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const { data } = useQuery({ queryKey: ["support-tickets"], queryFn: () => apiFetch<{ tickets: Ticket[] }>("/api/support/tickets") });

  const create = useMutation({
    mutationFn: () => apiFetch("/api/support/tickets", { method: "POST", body: JSON.stringify({ subject, message }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      setSubject("");
      setMessage("");
      toast({ title: t("common.submit"), variant: "success" });
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="font-heading text-2xl font-semibold">{t("help.title")}</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t("help.contactSupport")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="How can we help?" value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button disabled={!subject || message.length < 5 || create.isPending} onClick={() => create.mutate()}>
            {t("common.submit")}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-3">
        {data?.tickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">{ticket.subject}</CardTitle>
              <Badge>{ticket.status}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p className="text-muted">{ticket.message}</p>
              {ticket.replies.map((r) => (
                <div key={r.id} className="rounded-lg bg-surface-raised p-2 text-xs">
                  <p>{r.message}</p>
                  <p className="mt-1 text-muted">{formatDateTime(r.createdAt, `${locale}-IN`)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
