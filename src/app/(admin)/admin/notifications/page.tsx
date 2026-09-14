"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Send } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

type NotificationCopy = { title: string; body: string };
type SendResult = { users: number; sent: number; removed: number };

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/horoscope");
  const [lastResult, setLastResult] = useState<SendResult | null>(null);

  const generate = useMutation({
    mutationFn: () => apiFetch<NotificationCopy>("/api/admin/notifications/generate", { method: "POST", body: JSON.stringify({ topic: topic || undefined }) }),
    onSuccess: (res) => {
      setTitle(res.title);
      setBody(res.body);
    },
    onError: () => toast({ title: "Generation failed", variant: "danger" }),
  });

  const send = useMutation({
    mutationFn: () => apiFetch<SendResult>("/api/admin/notifications/send", { method: "POST", body: JSON.stringify({ title, body, url }) }),
    onSuccess: (res) => {
      setLastResult(res);
      toast({
        title: res.users === 0 ? "No one is subscribed yet" : `Sent to ${res.users} subscriber(s) (${res.sent} device(s))`,
        variant: res.users === 0 ? "default" : "success",
      });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        toast({ title: "Push isn't configured (VAPID keys missing) — nothing was sent", variant: "danger" });
      } else {
        toast({ title: "Send failed", variant: "danger" });
      }
    },
  });

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Push Notifications</h1>
      <p className="mt-1 text-sm text-muted">
        Sends a real browser/PWA push notification to every user who has turned on Daily horoscope reminder in Settings.
      </p>

      <Card className="mt-4 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles size={16} className="text-primary" /> Generate with AI
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div>
            <Label htmlFor="topic">Topic (optional)</Label>
            <Input
              id="topic"
              placeholder="e.g. Mercury retrograde starting this week"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending} className="w-fit">
            {generate.isPending ? "Generating…" : "Generate with AI"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Message</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div>
            <Label htmlFor="notif-title">Title</Label>
            <Input id="notif-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" maxLength={60} />
          </div>
          <div>
            <Label htmlFor="notif-body">Body</Label>
            <Textarea id="notif-body" value={body} onChange={(e) => setBody(e.target.value)} className="mt-1.5" maxLength={150} />
          </div>
          <div>
            <Label htmlFor="notif-url">Opens this page when tapped</Label>
            <Input id="notif-url" value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1.5" placeholder="/horoscope" />
          </div>
          <Button
            variant="primary"
            className="w-fit"
            disabled={!title || !body || send.isPending}
            onClick={() => send.mutate()}
          >
            <Send size={15} /> {send.isPending ? "Sending…" : "Send to all"}
          </Button>
        </CardContent>
      </Card>

      {lastResult && (
        <p className="mt-3 text-sm text-muted">
          Last send: {lastResult.users} subscriber(s), {lastResult.sent} device(s) delivered, {lastResult.removed} expired subscription(s) cleaned up.
        </p>
      )}
    </div>
  );
}
