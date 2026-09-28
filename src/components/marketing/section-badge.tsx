import { cn } from "@/lib/utils";

/** The small tan eyebrow pill above a section heading (e.g. "About Us", "Testimonial") — a plain content wrapper, not the semantic status Badge component. */
export function SectionBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-tan/50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-tan-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
