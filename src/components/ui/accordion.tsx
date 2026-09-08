"use client";

import * as RadixAccordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Accordion = RadixAccordion.Root;

export function AccordionItem({ className, ...props }: React.ComponentProps<typeof RadixAccordion.Item>) {
  return <RadixAccordion.Item className={cn("border-b border-border last:border-b-0", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof RadixAccordion.Trigger>) {
  return (
    <RadixAccordion.Header>
      <RadixAccordion.Trigger
        className={cn(
          "focus-ring flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-semibold text-foreground",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown size={16} className="shrink-0 text-muted transition-transform duration-200 data-[state=open]:rotate-180" />
      </RadixAccordion.Trigger>
    </RadixAccordion.Header>
  );
}

export function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof RadixAccordion.Content>) {
  return (
    <RadixAccordion.Content
      // forceMount: without this, Radix unmounts a closed item's children
      // from the DOM entirely once it finishes closing (or on first
      // render, before it's ever been opened) — found live, checking the
      // actual server-rendered HTML: a FAQ answer that's never been
      // clicked open renders as a completely empty <div>, no text at all.
      // For content added specifically so search engines can read it,
      // that defeats the point — a crawler reading raw HTML (or one that
      // never interacts with the accordion) would see no answer. forceMount
      // keeps the answer text in the markup always; the native `hidden`
      // attribute Radix still applies for a closed item is what keeps it
      // visually collapsed and out of layout, same as before.
      forceMount
      className={cn(
        // will-change hints the browser to optimize this specific element
        // for a height change ahead of time, instead of discovering it
        // needs to mid-animation — found live, without it the expand felt
        // stepped/jerky rather than a continuous glide, worse the more
        // else was on the page (e.g. the other FAQ column's items).
        "overflow-hidden text-sm leading-relaxed text-muted [will-change:height] data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
        className
      )}
      {...props}
    >
      <div className="pb-4">{children}</div>
    </RadixAccordion.Content>
  );
}
