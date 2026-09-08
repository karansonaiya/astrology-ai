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
