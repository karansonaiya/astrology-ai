"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PlaceSuggestion = {
  label: string;
  city: string;
  state: string | null;
  country: string;
  countryCode: string | null;
  latitude: number;
  longitude: number;
};

function flagEmoji(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return "🌍";
  return String.fromCodePoint(...[...countryCode].map((c) => 127397 + c.charCodeAt(0)));
}

/**
 * Birth-city input with live search-as-you-type suggestions (backed by
 * /api/geo/search) — lets someone pick the exact place from a real list
 * (with state/country shown, since e.g. "Surat" exists in both Gujarat and
 * Thailand) instead of free-typing something that might geocode wrong.
 * Selecting a suggestion hands back its exact lat/long via `onSelect`, so
 * the form can skip a second, potentially-mismatched geocode of the typed
 * text — see each form's submit handler for how that's used.
 */
export function CityAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  value: string;
  onChange: (text: string) => void;
  onSelect: (place: PlaceSuggestion) => void;
  placeholder?: string;
}) {
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // The too-short-to-search case is also handled inside the (deferred)
    // timeout callback below, not synchronously here, so this effect never
    // calls setState directly in its body — only from callbacks.
    debounceRef.current = setTimeout(async () => {
      const seq = ++requestSeq.current;
      if (value.trim().length < 2) {
        setResults([]);
        setOpen(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await apiFetch<{ results: PlaceSuggestion[] }>(`/api/geo/search?q=${encodeURIComponent(value)}`);
        if (seq !== requestSeq.current) return; // a newer keystroke already superseded this request
        setResults(res.results);
        setOpen(res.results.length > 0);
        setHighlight(-1);
      } catch {
        // best-effort — leave the field as plain free text if search fails
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const select = (place: PlaceSuggestion) => {
    onChange(place.label);
    onSelect(place);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          onKeyDown={(e) => {
            if (!open || results.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && highlight >= 0) {
              e.preventDefault();
              select(results[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {results.map((place, i) => (
            <button
              key={`${place.latitude},${place.longitude}`}
              type="button"
              onClick={() => select(place)}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                i === highlight ? "bg-primary/10" : "hover:bg-primary/5"
              )}
            >
              <span aria-hidden="true">{flagEmoji(place.countryCode)}</span>
              <span className="flex-1 truncate">
                <span className="font-medium">{place.city}</span>
                {place.state && <span className="text-muted"> · {place.state}</span>}
                <span className="text-muted"> · {place.country}</span>
              </span>
              <MapPin size={13} className="shrink-0 text-muted" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
