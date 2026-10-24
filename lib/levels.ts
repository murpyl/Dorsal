export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-rose-400", selected: "bg-rose-100 text-rose-950 border-rose-400", dot: "bg-rose-400" },
  { value: "partial", label: "Partly get it", color: "bg-amber-300", selected: "bg-amber-100 text-amber-950 border-amber-400", dot: "bg-amber-400" },
  { value: "can_explain", label: "Can explain it", color: "bg-emerald-400", selected: "bg-emerald-100 text-emerald-950 border-emerald-400", dot: "bg-emerald-400" },
] as const;

export type Phase = "pre" | "post";
/** One wording for the signal phase everywhere (header, controls, comparison, room check-in). */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before help (pre)", post: "After help (post)" };

export type Level = (typeof LEVELS)[number]["value"];
