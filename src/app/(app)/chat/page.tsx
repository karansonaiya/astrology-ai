"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, Trash2, ThumbsUp, ThumbsDown, Flag, Paperclip, X } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BASE64_LENGTH } from "@/lib/validations/chat";

type ChatListItem = { id: string; title: string; updatedAt: string };
type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  imageData?: string | null;
  imageMimeType?: string | null;
  feedback?: { rating: "helpful" | "not_helpful" }[];
};
type ChatDetail = { chat: { id: string; title: string; messages: Message[] } };

// Raw file-size cap mirroring the server's base64 length cap (base64 inflates size by ~4/3).
const MAX_IMAGE_BYTES = Math.floor((MAX_IMAGE_BASE64_LENGTH * 3) / 4);

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Jyoti AI is typing">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
    </span>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1)); // strip "data:<mime>;base64," prefix
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function ChatPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get("id");
  const qc = useQueryClient();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [pendingImage, setPendingImage] = useState<{ data: string; mimeType: string; previewUrl: string } | null>(null);
  // Shown immediately on send, before the round-trip (which includes AI
  // generation, so can take a few seconds) resolves — without this the chat
  // pane looked unchanged after sending, which is what made people hit
  // send/Enter a second time.
  const [optimisticMsg, setOptimisticMsg] = useState<{ content: string; imagePreviewUrl?: string } | null>(null);
  const [isSendingFirstMessage, setIsSendingFirstMessage] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File | undefined) => {
    if (!file) return;
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast({ title: t("chat.invalidImageType"), variant: "danger" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: t("chat.imageTooLarge"), variant: "danger" });
      return;
    }
    const data = await fileToBase64(file);
    setPendingImage({ data, mimeType: file.type, previewUrl: URL.createObjectURL(file) });
  };

  const { data: chatList } = useQuery({ queryKey: ["chats"], queryFn: () => apiFetch<{ chats: ChatListItem[] }>("/api/chat") });
  const { data: chatDetail, isLoading } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => apiFetch<ChatDetail>(`/api/chat/${chatId}`),
    enabled: !!chatId,
  });

  const createChat = useMutation({
    mutationFn: () => apiFetch<{ chat: { id: string } }>("/api/chat", { method: "POST" }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      router.push(`/chat?id=${res.chat.id}`);
    },
  });

  const deleteChat = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/chat/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      router.push("/chat");
    },
  });

  type SendMessageVars = { content: string; image?: { data: string; mimeType: string }; imagePreviewUrl?: string };
  const sendMessage = useMutation({
    mutationFn: ({ content, image }: SendMessageVars) =>
      apiFetch(`/api/chat/${chatId}/messages`, { method: "POST", body: JSON.stringify({ content, image }) }),
    onSuccess: (_data, variables) => {
      if (variables.imagePreviewUrl) URL.revokeObjectURL(variables.imagePreviewUrl);
      setOptimisticMsg(null);
      qc.invalidateQueries({ queryKey: ["chat", chatId] });
      qc.invalidateQueries({ queryKey: ["credits-summary"] });
      qc.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (err, variables) => {
      // Roll back to exactly what was there before the failed send, so
      // nothing typed/attached gets silently lost.
      setOptimisticMsg(null);
      setInput(variables.content);
      if (variables.image && variables.imagePreviewUrl) {
        setPendingImage({ data: variables.image.data, mimeType: variables.image.mimeType, previewUrl: variables.imagePreviewUrl });
      }
      if (err instanceof ApiError && err.status === 402) {
        toast({ title: t("chat.outOfCredits"), variant: "danger" });
      } else {
        toast({ title: t("errors.generic"), variant: "danger" });
      }
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatDetail, optimisticMsg, sendMessage.isPending, isSendingFirstMessage]);

  const feedback = useMutation({
    mutationFn: ({ messageId, rating }: { messageId: string; rating: "helpful" | "not_helpful" }) =>
      apiFetch(`/api/chat/messages/${messageId}/feedback`, { method: "POST", body: JSON.stringify({ rating }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", chatId] }),
  });

  const report = useMutation({
    mutationFn: ({ messageId, reason }: { messageId: string; reason: string }) =>
      apiFetch(`/api/chat/messages/${messageId}/report`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      toast({ title: t("chat.reportSent"), variant: "success" });
      setReportingId(null);
      setReportReason("");
    },
  });

  const suggestions = [t("chat.suggestion1"), t("chat.suggestion2"), t("chat.suggestion3"), t("chat.suggestion4")];

  const submit = async (content: string) => {
    // Guards against a genuinely real double-send: with no immediate visual
    // feedback (fixed below via optimisticMsg), a slow reply used to look
    // like nothing had happened, so a second Enter/click before this first
    // request settled fired a second message. This blocks that regardless
    // of UI timing.
    if (sendMessage.isPending || createChat.isPending || isSendingFirstMessage) return;
    if (!content.trim() && !pendingImage) return;

    const image = pendingImage ? { data: pendingImage.data, mimeType: pendingImage.mimeType } : undefined;
    const imagePreviewUrl = pendingImage?.previewUrl;

    let targetId = chatId;
    if (!targetId) {
      setIsSendingFirstMessage(true);
      setOptimisticMsg({ content, imagePreviewUrl });
      setInput("");
      setPendingImage(null);
      try {
        const res = await createChat.mutateAsync();
        targetId = res.chat.id;
        router.push(`/chat?id=${targetId}`);
        await apiFetch(`/api/chat/${targetId}/messages`, { method: "POST", body: JSON.stringify({ content, image }) });
        qc.invalidateQueries({ queryKey: ["chat", targetId] });
        qc.invalidateQueries({ queryKey: ["chats"] });
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      } catch {
        setInput(content);
        if (image && imagePreviewUrl) setPendingImage({ data: image.data, mimeType: image.mimeType, previewUrl: imagePreviewUrl });
        toast({ title: t("errors.generic"), variant: "danger" });
      } finally {
        setOptimisticMsg(null);
        setIsSendingFirstMessage(false);
      }
      return;
    }

    setOptimisticMsg({ content, imagePreviewUrl });
    setInput("");
    setPendingImage(null);
    sendMessage.mutate({ content, image, imagePreviewUrl });
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-6xl">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border p-3 md:flex">
        <Button onClick={() => createChat.mutate()} className="mb-3">
          <Plus size={16} /> {t("chat.newChat")}
        </Button>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {chatList?.chats.map((c) => (
            <div key={c.id} className="group flex items-center gap-1">
              <button
                onClick={() => router.push(`/chat?id=${c.id}`)}
                className={cn(
                  "focus-ring flex-1 truncate rounded-lg px-3 py-2 text-left text-sm",
                  chatId === c.id ? "bg-primary/15 text-primary" : "text-muted hover:bg-surface-raised"
                )}
              >
                {c.title}
              </button>
              <button
                aria-label={t("chat.deleteChat")}
                className="focus-ring rounded p-1 text-muted opacity-0 hover:text-danger group-hover:opacity-100"
                onClick={() => deleteChat.mutate(c.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          {!chatId ? (
            <div className="mx-auto max-w-lg text-center">
              <h1 className="font-heading text-xl font-semibold">{t("chat.emptyStateTitle")}</h1>
              <p className="mt-2 text-sm text-muted">{t("chat.emptyStateDesc")}</p>
              <div className="mt-6 flex flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="focus-ring rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm hover:border-primary/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-16 w-2/3" />
              <Skeleton className="ml-auto h-16 w-2/3" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {chatDetail?.chat.messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <Card className={cn("max-w-[85%] p-4", m.role === "user" ? "bg-primary/10 border-primary/20" : "")}>
                    {m.role === "assistant" && (
                      <div className="mb-2">
                        <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
                      </div>
                    )}
                    {m.imageData && m.imageMimeType && (
                      // eslint-disable-next-line @next/next/no-img-element -- base64 data URI, not an optimizable remote asset
                      <img
                        src={`data:${m.imageMimeType};base64,${m.imageData}`}
                        alt=""
                        className="mb-2 max-h-64 rounded-lg border border-border object-contain"
                      />
                    )}
                    {m.content && <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>}
                    {m.role === "assistant" && (
                      <div className="mt-3 flex items-center gap-3 border-t border-border pt-2">
                        <button
                          className={cn("focus-ring flex items-center gap-1 text-xs text-muted hover:text-success", m.feedback?.[0]?.rating === "helpful" && "text-success")}
                          onClick={() => feedback.mutate({ messageId: m.id, rating: "helpful" })}
                        >
                          <ThumbsUp size={13} /> {t("chat.helpful")}
                        </button>
                        <button
                          className={cn("focus-ring flex items-center gap-1 text-xs text-muted hover:text-danger", m.feedback?.[0]?.rating === "not_helpful" && "text-danger")}
                          onClick={() => feedback.mutate({ messageId: m.id, rating: "not_helpful" })}
                        >
                          <ThumbsDown size={13} /> {t("chat.notHelpful")}
                        </button>
                        <button
                          className="focus-ring ml-auto flex items-center gap-1 text-xs text-muted hover:text-foreground"
                          onClick={() => setReportingId(m.id)}
                        >
                          <Flag size={13} /> {t("chat.report")}
                        </button>
                      </div>
                    )}
                  </Card>
                </div>
              ))}
              {optimisticMsg && (
                <div className="flex justify-end">
                  <Card className="max-w-[85%] border-primary/20 bg-primary/10 p-4">
                    {optimisticMsg.imagePreviewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not an optimizable remote asset
                      <img
                        src={optimisticMsg.imagePreviewUrl}
                        alt=""
                        className="mb-2 max-h-64 rounded-lg border border-border object-contain"
                      />
                    )}
                    {optimisticMsg.content && <p className="whitespace-pre-wrap text-sm leading-relaxed">{optimisticMsg.content}</p>}
                  </Card>
                </div>
              )}
              {(sendMessage.isPending || isSendingFirstMessage) && (
                <div className="flex justify-start">
                  <Card className="max-w-[85%] p-4">
                    <div className="mb-2">
                      <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
                    </div>
                    <TypingDots />
                  </Card>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 md:px-8">
          <p className="mb-2 text-center text-[11px] text-muted">{t("common.notForCritical")}</p>
          {pendingImage && (
            <div className="mb-2 flex items-center gap-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not an optimizable remote asset */}
                <img src={pendingImage.previewUrl} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                <button
                  type="button"
                  aria-label={t("chat.removeImage")}
                  className="focus-ring absolute -right-1.5 -top-1.5 rounded-full bg-foreground text-background"
                  onClick={() => {
                    URL.revokeObjectURL(pendingImage.previewUrl);
                    setPendingImage(null);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-end gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                handleFileSelect(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("chat.attachImage")}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={16} />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chat.placeholder")}
              className="min-h-12 flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              onPaste={(e) => {
                const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
                const file = item?.getAsFile();
                if (file) {
                  e.preventDefault(); // it's an image, not text — don't also paste a filename/garbage into the textarea
                  handleFileSelect(file);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={(!input.trim() && !pendingImage) || sendMessage.isPending || createChat.isPending || isSendingFirstMessage}
            >
              <Send size={16} />
            </Button>
          </form>
        </div>
      </section>

      <Dialog open={!!reportingId} onOpenChange={(open) => !open && setReportingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.report")}</DialogTitle>
            <DialogDescription>{t("chat.reportSent")}</DialogDescription>
          </DialogHeader>
          <Textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="What went wrong?" />
          <Button
            className="mt-4 w-full"
            disabled={reportReason.length < 3}
            onClick={() => reportingId && report.mutate({ messageId: reportingId, reason: reportReason })}
          >
            {t("common.submit")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
