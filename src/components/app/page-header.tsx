import type { LucideIcon } from "lucide-react";

/** Shared tool-page header — icon in a tan badge + title + optional subtitle. Same treatment as the marketing features/how-it-works cards, so logged-in tool pages read as the same product as the marketing site. */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tan/40 text-tan-foreground">
        <Icon size={20} />
      </span>
      <div>
        <h1 className="font-heading text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
