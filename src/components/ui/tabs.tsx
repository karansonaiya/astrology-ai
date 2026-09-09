"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      // max-w-full + overflow-x-auto: found live, a row with enough triggers
      // to not fit a phone's width (e.g. the chat personas page's 7 specialty
      // filters) was overflowing its own inline-flex box, widening the whole
      // page and forcing a horizontal scrollbar for the entire mobile
      // viewport instead of just this row. Same category of bug (and same
      // fix shape) as the min-w-0 fix on the app shell's kundli tables.
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "focus-ring shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cn("mt-4 focus:outline-none", className)} {...props} />;
}
