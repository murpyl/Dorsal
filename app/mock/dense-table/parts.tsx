"use client";

import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { LEVELS, type Level } from "@/lib/levels";
import { cn } from "@/lib/utils";

export const SHORT_LEVEL: Record<Level, string> = { confused: "Confused", partial: "Partly", can_explain: "Can explain" };

/** Inline 3-way segmented control: one row per concept, no scrolling needed. */
export function SegmentedLevel({
  value,
  onChange,
  size = "sm",
  label,
}: {
  value: Level | null;
  onChange: (level: Level) => void;
  size?: "sm" | "lg";
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={`How well do you understand ${label}?`}
      className={cn("grid grid-cols-3 overflow-hidden rounded-lg border bg-card", size === "lg" ? "h-12" : "h-9")}
    >
      {LEVELS.map((l, i) => {
        const selected = value === l.value;
        return (
          <button
            key={l.value}
            type="button"
            aria-pressed={selected}
            aria-label={l.label}
            onClick={() => onChange(l.value)}
            className={cn(
              "pressable flex items-center justify-center gap-1.5 font-medium outline-none focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
              size === "lg" ? "text-sm" : "text-xs",
              i > 0 && "border-l",
              selected ? l.selected : "text-foreground hover:bg-muted",
            )}
          >
            <span className={cn("size-1.5 shrink-0 rounded-full", selected ? "bg-current opacity-80" : l.dot)} aria-hidden />
            {SHORT_LEVEL[l.value]}
          </button>
        );
      })}
    </div>
  );
}

export function MockBar({ screen, viewport }: { screen: string; viewport: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground">
      <span>
        <Link href="/mock/dense-table" className="font-medium text-foreground underline-offset-2 hover:underline">
          Dense Table
        </Link>{" "}
        mockup · {screen} · fixture data, nothing is saved
      </span>
      <span className="hidden tabular-nums sm:inline">{viewport}</span>
    </div>
  );
}

export function Shortcut({ keys, children }: { keys: string; children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {children}
      <Kbd aria-hidden>{keys}</Kbd>
    </span>
  );
}

export function LivePill({ children }: { children: React.ReactNode }) {
  return (
    <Badge className="gap-1.5">
      <span className="relative flex size-1.5" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground/70 motion-reduce:hidden" />
        <span className="relative inline-flex size-1.5 rounded-full bg-primary-foreground" />
      </span>
      {children}
    </Badge>
  );
}

export { Brand };
