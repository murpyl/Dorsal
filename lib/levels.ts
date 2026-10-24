export const LEVELS = [
  {
    value: "confused",
    label: "Confused",
    color: "bg-rose-400",
    selected: "border-rose-400/70 bg-rose-400/15 text-rose-100 shadow-[0_0_0_1px_oklch(0.76_0.17_12_/_35%),0_0_24px_-6px_var(--level-rose)]",
    dot: "bg-rose-400 shadow-[0_0_8px_var(--level-rose)]",
  },
  {
    value: "partial",
    label: "Partly get it",
    color: "bg-amber-300",
    selected: "border-amber-300/70 bg-amber-300/15 text-amber-100 shadow-[0_0_0_1px_oklch(0.86_0.15_80_/_35%),0_0_24px_-6px_var(--level-amber)]",
    dot: "bg-amber-300 shadow-[0_0_8px_var(--level-amber)]",
  },
  {
    value: "can_explain",
    label: "Can explain it",
    color: "bg-emerald-300",
    selected: "border-emerald-300/70 bg-emerald-300/15 text-emerald-100 shadow-[0_0_0_1px_oklch(0.86_0.14_162_/_35%),0_0_24px_-6px_var(--level-mint)]",
    dot: "bg-emerald-300 shadow-[0_0_8px_var(--level-mint)]",
  },
] as const;

export type Phase = "pre" | "post";
/** One wording for the signal phase everywhere (header, controls, comparison, room check-in). */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before help (pre)", post: "After help (post)" };

export type Level = (typeof LEVELS)[number]["value"];
