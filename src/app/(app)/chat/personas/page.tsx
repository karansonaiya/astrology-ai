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
  { value: "education", labelKey: "personas.filterEducation" },
  { value: "health", labelKey: "personas.filterHealth" },
];

const SPECIALTY_BADGE_KEY: Record<PersonaSpecialty, string> = {
  general: "personas.filterGeneral",
  love: "personas.filterLove",
  career: "personas.filterCareer",
  marriage: "personas.filterMarriage",
  education: "personas.filterEducation",
  health: "personas.filterHealth",
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
          {/* grid-cols-2 from the smallest width up (not sm:grid-cols-2) —
              matches the photo-forward, 2-up card style the founder asked
              to match (a real astrologer-marketplace app's persona picker):
              portrait image filling the top of the card, name/specialty/CTA
              in a solid area below. Rating and a per-minute price aren't
              carried over from that reference — this app has neither (no
              live per-minute human sessions to rate or bill), so the layout
              is matched, not invented numbers to fill the same slots. */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
            {visible.map((persona) => (
              <Card key={persona.code} className="overflow-hidden">
                <div className="relative aspect-[3/4] w-full bg-surface-raised">
                  {imageFailed[persona.code] ? (
                    <div className={`flex h-full w-full items-center justify-center text-2xl font-semibold ${persona.avatarColor}`}>
                      {initialsFromName(persona.name)}
                    </div>
                  ) : (
                    <Image
                      src={persona.avatarImage}
                      alt={persona.name}
                      fill
                      sizes="(min-width: 640px) 240px, 50vw"
                      className="object-cover"
                      onError={() => setImageFailed((prev) => ({ ...prev, [persona.code]: true }))}
                    />
                  )}
                </div>
                <CardContent className="flex flex-col gap-1.5 p-3">
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 truncate font-heading text-sm font-semibold sm:text-base">{persona.name}</p>
                  </div>
                  <Badge variant="default" className="w-fit">{t(SPECIALTY_BADGE_KEY[persona.specialty])}</Badge>
                  <p className="line-clamp-2 text-xs text-muted">{persona.tagline}</p>
                  <Button
                    size="sm"
                    className="mt-1.5 w-full"
                    disabled={startChat.isPending && startingCode === persona.code}
                    onClick={() => startChat.mutate(persona.code)}
                  >
                    {t("personas.startChat")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
