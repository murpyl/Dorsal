export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-clay", selected: "bg-clay text-clay-foreground border-clay", dot: "bg-clay" },
  { value: "partial", label: "Partly get it", color: "bg-ochre", selected: "bg-ochre text-ochre-foreground border-ochre", dot: "bg-ochre" },
  { value: "can_explain", label: "Can explain it", color: "bg-moss", selected: "bg-moss text-moss-foreground border-moss", dot: "bg-moss" },
] as const;

export type Phase = "pre" | "post";
/** `pre` = rating on the session page; `post` = rating updated inside a peer help room. Only the comparison panel shows these. */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before peer help", post: "After peer help" };

export type Level = (typeof LEVELS)[number]["value"];
