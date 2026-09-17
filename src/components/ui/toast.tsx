"use client";

import * as RadixToast from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "danger";
type ToastItem = { id: number; title: string; description?: string; variant: ToastVariant };
type ToastInput = { title: string; description?: string; variant?: ToastVariant };

const ToastCtx = createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((t: ToastInput) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { variant: "default", ...t, id }]);
  }, []);

  const remove = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <ToastCtx.Provider value={{ toast }}>
      {/* 6s: long enough to read a full error sentence, short enough not to
          pile up if several fire back to back. Swipe-to-dismiss goes right,
          matching the top-right corner these now appear in. */}
      <RadixToast.Provider swipeDirection="right" duration={6000}>
        {children}
        {items.map((item) => (
          <RadixToast.Root
            key={item.id}
            onOpenChange={(open) => !open && remove(item.id)}
            className={cn(
              "glass pointer-events-auto w-full rounded-xl px-4 py-3 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-top-2 data-[swipe=end]:animate-out data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-right-4",
              item.variant === "success" && "border-success",
              item.variant === "danger" && "border-danger"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <RadixToast.Title className="text-sm font-medium">{item.title}</RadixToast.Title>
                {item.description && (
                  <RadixToast.Description className="mt-1 text-xs text-muted">{item.description}</RadixToast.Description>
                )}
              </div>
              <RadixToast.Close aria-label="Close" className="focus-ring shrink-0 rounded p-1 text-muted hover:text-foreground">
                <X size={14} />
              </RadixToast.Close>
            </div>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed inset-x-4 top-4 z-[100] flex max-h-screen flex-col gap-2 outline-none sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm" />
      </RadixToast.Provider>
    </ToastCtx.Provider>
  );
}
