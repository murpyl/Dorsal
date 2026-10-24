export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-red-500", selected: "bg-red-500 text-white border-red-500", dot: "bg-red-500" },
  { value: "partial", label: "Partly get it", color: "bg-amber-400", selected: "bg-amber-400 text-amber-950 border-amber-400", dot: "bg-amber-400" },
  { value: "can_explain", label: "Can explain it", color: "bg-emerald-600", selected: "bg-emerald-600 text-white border-emerald-600", dot: "bg-emerald-600" },
] as const;

export type Phase = "pre" | "post";
/** One wording for the signal phase everywhere (header, controls, comparison, room check-in). */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before help (pre)", post: "After help (post)" };

export type Level = (typeof LEVELS)[number]["value"];
