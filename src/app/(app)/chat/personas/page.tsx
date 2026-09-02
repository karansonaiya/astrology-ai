"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { initialsFromName } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PERSONAS, type PersonaSpecialty } from "@/lib/personas/catalog";

const SPECIALTY_FILTERS: { value: "all" | PersonaSpecialty; labelKey: string }[] = [
  { value: "all", labelKey: "personas.filterAll" },
  { value: "general", labelKey: "personas.filterGeneral" },
  { value: "love", labelKey: "personas.filterLove" },
  { value: "career", labelKey: "personas.filterCareer" },
  { value: "marriage", labelKey: "personas.filterMarriage" },
];

const SPECIALTY_BADGE_KEY: Record<PersonaSpecialty, string> = {
  general: "personas.filterGeneral",
  love: "personas.filterLove",
  career: "personas.filterCareer",
  marriage: "personas.filterMarriage",
};

export default function ChatPersonasPage() {
  const t = useT();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | PersonaSpecialty>("all");
  const [startingCode, setStartingCode] = useState<string | null>(null);
  // Falls back to the colored-initials circle if a persona's AI-generated
  // portrait (public/personas/*.webp) ever fails to load, rather than
  // showing a broken-image icon.
  const [imageFailed, setImageFailed] = useState<Record<string, boolean>>({});

  const startChat = useMutation({
    mutationFn: (personaCode: string) => apiFetch<{ chat: { id: string } }>("/api/chat", { method: "POST", body: JSON.stringify({ personaCode }) }),
    onMutate: (personaCode) => setStartingCode(personaCode),
    onSuccess: (res) => router.push(`/chat?id=${res.chat.id}`),
    onSettled: () => setStartingCode(null),
  });

  const visible = filter === "all" ? PERSONAS : PERSONAS.filter((p) => p.specialty === filter);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <h1 className="font-heading text-2xl font-semibold">{t("personas.pageTitle")}</h1>
      <p className="mt-1 text-sm text-muted">{t("personas.pageSubtitle")}</p>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | PersonaSpecialty)} className="mt-5">
        <TabsList>
          {SPECIALTY_FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>{t(f.labelKey)}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={filter}>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {visible.map((persona) => (
              <Card key={persona.code}>
                <CardContent className="flex items-start gap-3 pt-5">
                  {imageFailed[persona.code] ? (
                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${persona.avatarColor}`}>
                      {initialsFromName(persona.name)}
                    </div>
                  ) : (
                    <Image
                      src={persona.avatarImage}
                      alt={persona.name}
                      width={64}
                      height={64}
                      className="h-16 w-16 shrink-0 rounded-full object-cover"
                      onError={() => setImageFailed((prev) => ({ ...prev, [persona.code]: true }))}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-heading text-base font-semibold">{persona.name}</p>
                      <Badge variant="default">{t(SPECIALTY_BADGE_KEY[persona.specialty])}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{persona.tagline}</p>
                    <Button
                      size="sm"
                      className="mt-3"
                      disabled={startChat.isPending && startingCode === persona.code}
                      onClick={() => startChat.mutate(persona.code)}
                    >
                      {t("personas.startChat")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
