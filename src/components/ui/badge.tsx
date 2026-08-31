import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-surface-raised border border-border text-muted",
      primary: "bg-primary/15 text-primary border border-primary/30",
      gold: "bg-gold/15 text-gold border border-gold/30",
      success: "bg-success/15 text-success border border-success/30",
      danger: "bg-danger/15 text-danger border border-danger/30",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
