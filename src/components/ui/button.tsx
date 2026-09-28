import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:opacity-90",
        gold: "bg-gold text-(--color-background) hover:opacity-90",
        outline: "border border-border bg-transparent hover:bg-surface",
        ghost: "bg-transparent hover:bg-surface",
        danger: "bg-danger text-white hover:opacity-90",
        link: "bg-transparent underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-5",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  // Found live: every "Buy now"/checkout button across the app disabled
  // itself correctly while its request was in flight, but gave zero visual
  // feedback — clicking it looked like nothing happened, which is exactly
  // what invites a second click/tap. Not supported with `asChild` (a Slot
  // needs exactly one child element to merge props into; every asChild use
  // in this app is a Link-wrapped nav button, never a loading action).
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
