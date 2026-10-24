export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-red-600", selected: "bg-red-600 text-white border-foreground", dot: "bg-red-600" },
  { value: "partial", label: "Partly get it", color: "bg-orange-500", selected: "bg-orange-500 text-black border-foreground", dot: "bg-orange-500" },
  { value: "can_explain", label: "Can explain it", color: "bg-green-600", selected: "bg-green-600 text-white border-foreground", dot: "bg-green-600" },
] as const;

export type Phase = "pre" | "post";
/** One wording for the signal phase everywhere (header, controls, comparison, room check-in). */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before help (pre)", post: "After help (post)" };

export type Level = (typeof LEVELS)[number]["value"];
