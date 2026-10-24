"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { aliasHue, initials } from "./fixtures";

/** Small, flat avatar for an alias. Colour is derived from the alias so the same person looks the same on every screen. */
export function Avatar({ alias, size = "md", className }: { alias: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const hue = aliasHue(alias);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full border-2 border-card font-heading font-semibold select-none",
        size === "sm" && "size-6 text-[10px]",
        size === "md" && "size-8 text-xs",
        size === "lg" && "size-10 text-sm",
        className,
      )}
      style={{ background: `oklch(0.9 0.05 ${hue})`, color: `oklch(0.35 0.08 ${hue})` }}
      aria-hidden
    >
      {initials(alias)}
    </span>
  );
}

/** Transient status announcement (topic changed, cluster published, room opened). Polite live region; auto-dismisses. */
export function Toast({
  toast,
  onDismiss,
  className,
}: {
  toast: { text: string; action?: { label: string; onClick: () => void } } | null;
  onDismiss: () => void;
  className?: string;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);
  return (
    <div aria-live="polite" className={cn("pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4", className)}>
      {toast && (
        <div className="enter pointer-events-auto flex max-w-md items-center gap-2 rounded-full border border-foreground/15 bg-foreground px-4 py-2 text-sm text-background">
          <span className="min-w-0">{toast.text}</span>
          {toast.action && (
            <Button size="xs" variant="secondary" onClick={toast.action.onClick} className="shrink-0">
              {toast.action.label}
            </Button>
          )}
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-background/15">
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ text: string; action?: { label: string; onClick: () => void } } | null>(null);
  return { toast, show: setToast, dismiss: () => setToast(null) };
}

/** Thin strip explaining that this is a clickable layout mock with fixture data. */
export function MockBanner({ screen }: { screen: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground">
      <span>
        Layout mock · <span className="font-medium text-foreground">Sidebar Shell</span> · {screen} · fixture data, nothing is saved
      </span>
      <Link href="/mock/sidebar-shell" className="shrink-0 underline underline-offset-2 hover:text-foreground">
        All screens
      </Link>
    </div>
  );
}

export const relTime = (minutesAgo: number) => (minutesAgo < 1 ? "just now" : minutesAgo === 1 ? "1 min ago" : `${minutesAgo} min ago`);
