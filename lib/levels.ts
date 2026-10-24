export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-red-500" },
  { value: "partial", label: "Partly get it", color: "bg-amber-400" },
  { value: "can_explain", label: "Can explain it", color: "bg-emerald-500" },
] as const;

export type Phase = "pre" | "post";
/** One wording for the signal phase everywhere (header, controls, comparison, room check-in). */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before help (pre)", post: "After help (post)" };

export type Level = (typeof LEVELS)[number]["value"];
