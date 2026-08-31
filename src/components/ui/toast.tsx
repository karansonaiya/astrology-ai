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
      <RadixToast.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map((item) => (
          <RadixToast.Root
            key={item.id}
            onOpenChange={(open) => !open && remove(item.id)}
            className={cn(
              "glass rounded-xl px-4 py-3 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out",
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
              <RadixToast.Close aria-label="Close" className="focus-ring rounded p-0.5 text-muted hover:text-foreground">
                <X size={14} />
              </RadixToast.Close>
            </div>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-20 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 p-4 outline-none md:bottom-6" />
      </RadixToast.Provider>
    </ToastCtx.Provider>
  );
}
