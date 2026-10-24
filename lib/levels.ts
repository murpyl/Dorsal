export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-rose-300", selected: "bg-rose-300 text-rose-950 border-rose-300", dot: "bg-rose-300" },
  { value: "partial", label: "Partly get it", color: "bg-amber-300", selected: "bg-amber-300 text-amber-950 border-amber-300", dot: "bg-amber-300" },
  { value: "can_explain", label: "Can explain it", color: "bg-emerald-300", selected: "bg-emerald-300 text-emerald-950 border-emerald-300", dot: "bg-emerald-300" },
] as const;

export type Phase = "pre" | "post";
/** One wording for the signal phase everywhere (header, controls, comparison, room check-in). */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before help (pre)", post: "After help (post)" };

export type Level = (typeof LEVELS)[number]["value"];
