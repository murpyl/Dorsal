export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-level-confused", selected: "bg-level-confused text-white border-level-confused", dot: "bg-level-confused" },
  { value: "partial", label: "Partly get it", color: "bg-level-partial", selected: "bg-level-partial text-accent-foreground border-level-partial", dot: "bg-level-partial" },
  { value: "can_explain", label: "Can explain it", color: "bg-level-explain", selected: "bg-level-explain text-white border-level-explain", dot: "bg-level-explain" },
] as const;

export type Phase = "pre" | "post";
/** One wording for the signal phase everywhere (header, controls, comparison, room check-in). */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before help (pre)", post: "After help (post)" };

export type Level = (typeof LEVELS)[number]["value"];
