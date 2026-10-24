"use client";

import { LEVELS, type Level } from "@/lib/levels";

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
            className={`rounded-lg border px-3 py-3 text-sm font-medium transition disabled:opacity-50 ${
              selected
                ? `${l.color} border-transparent text-white`
                : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
