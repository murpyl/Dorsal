export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-red-400", selected: "bg-red-500/15 text-red-300 border-red-400", dot: "bg-red-400" },
  { value: "partial", label: "Partly get it", color: "bg-amber-400", selected: "bg-amber-400/15 text-amber-200 border-amber-400", dot: "bg-amber-400" },
  { value: "can_explain", label: "Can explain it", color: "bg-emerald-400", selected: "bg-emerald-500/15 text-emerald-300 border-emerald-400", dot: "bg-emerald-400" },
] as const;

export type Phase = "pre" | "post";
/** One wording for the signal phase everywhere (header, controls, comparison, room check-in). */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before help (pre)", post: "After help (post)" };

export type Level = (typeof LEVELS)[number]["value"];
