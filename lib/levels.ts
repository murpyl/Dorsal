export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-clay", selected: "bg-clay text-clay-foreground border-clay", dot: "bg-clay" },
  { value: "partial", label: "Partly get it", color: "bg-ochre", selected: "bg-ochre text-ochre-foreground border-ochre", dot: "bg-ochre" },
  { value: "can_explain", label: "Can explain it", color: "bg-moss", selected: "bg-moss text-moss-foreground border-moss", dot: "bg-moss" },
] as const;

export type Phase = "pre" | "post";
/** One wording for the signal phase everywhere (header, controls, comparison, room check-in). */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before help (pre)", post: "After help (post)" };

export type Level = (typeof LEVELS)[number]["value"];
