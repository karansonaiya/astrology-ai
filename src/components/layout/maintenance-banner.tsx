"use client";

import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

export function MaintenanceBanner() {
  const { data } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: () => apiFetch<{ flags: Record<string, boolean> }>("/api/public/feature-flags"),
    staleTime: 60_000,
  });

  if (!data?.flags.maintenance_mode) return null;

  return (
    <div className="flex items-center gap-2 border-b border-gold/30 bg-gold/10 px-4 py-2 text-xs text-gold md:px-6">
      <TriangleAlert size={14} />
      Jyoti AI is undergoing scheduled maintenance. Some features may be temporarily unavailable.
    </div>
  );
}
