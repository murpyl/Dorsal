"use client";

import { LEVELS, type Level } from "@/lib/levels";
import { cn } from "@/lib/utils";

export function ConfidenceSelector({
  value,
  onChange,
  disabled,
}: {
  value: Level | null;
  onChange: (level: Level) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="How well do you understand this?">
      {LEVELS.map((l) => {
        const selected = value === l.value;
        return (
          <button
            key={l.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(l.value)}
            className={cn(
              "pressable flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm leading-tight font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 sm:text-[15px]",
              selected ? `${l.selected} shadow-sm` : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            <span className={cn("size-2 rounded-full", selected ? "bg-current opacity-80" : l.dot)} aria-hidden />
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
