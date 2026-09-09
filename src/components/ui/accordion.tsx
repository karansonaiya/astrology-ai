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
      // keeps the answer text in the markup always; the grid-rows trick
      // below (not the native `hidden` attribute) is what keeps it
      // visually collapsed and out of layout.
      forceMount
      className={cn(
        // Animates via CSS transition on grid-template-rows (0fr <-> 1fr),
        // not a @keyframes animation on height driven by Radix's
        // --radix-accordion-content-height variable (the previous
        // approach). Found live: clicking to open, then clicking again
        // before the 300ms finished (or clicking a different item while
        // one was still animating) made the SECOND click's animation start
        // from a stale/wrong height — the classic failure mode of
        // keyframe-height-from-a-snapshotted-CSS-var, and exactly what
        // showed up as "opens in tiny jerky steps" / "first click doesn't
        // close it". A CSS *transition* (not an @keyframes animation)
        // naturally reverses smoothly from wherever it currently is when
        // interrupted, so rapid/overlapping clicks can't desync it the
        // same way — and grid-template-rows: 0fr/1fr animates to the
        // content's real height without needing any JS-measured value at
        // all, so it also can't go stale if the content's own height
        // changes (e.g. a web font finishing its swap) mid-transition.
        //
        // `group`: lets the inner content div below react to THIS
        // element's data-state (Radix only ever sets data-state on the
        // Content element itself, not on any nested div) so the text can
        // fade in and drop down slightly as the row grows, instead of
        // just appearing the instant its row has any height — that's what
        // gives the "unrolls from the top downward" feel that a bare
        // height/row reveal alone doesn't.
        "group grid text-sm leading-relaxed text-muted transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:grid-rows-[0fr] data-[state=open]:grid-rows-[1fr]",
        className
      )}
      {...props}
    >
      {/* The grid-rows trick needs overflow:hidden on a CHILD of the grid
          container, not the container itself, to actually clip content
          while its row is sized at 0fr. */}
      <div className="overflow-hidden">
        {/* delay-100 only on the way open (not on close) — lets the row
            start growing a beat before the text starts fading/dropping in,
            instead of both happening in perfect lockstep, which read as
            "instant"/rushed even at a longer duration. */}
        <div className="pb-4 -translate-y-1.5 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=open]:translate-y-0 group-data-[state=open]:opacity-100 group-data-[state=open]:delay-100">
          {children}
        </div>
      </div>
    </RadixAccordion.Content>
  );
}
