export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-red-400", selected: "bg-red-500/15 text-red-300 border-red-400", dot: "bg-red-400" },
  { value: "partial", label: "Partly get it", color: "bg-amber-400", selected: "bg-amber-400/15 text-amber-200 border-amber-400", dot: "bg-amber-400" },
  { value: "can_explain", label: "Can explain it", color: "bg-emerald-400", selected: "bg-emerald-500/15 text-emerald-300 border-emerald-400", dot: "bg-emerald-400" },
] as const;

export type Phase = "pre" | "post";
/** `pre` = rating on the session page; `post` = rating updated inside a peer help room. Only the comparison panel shows these. */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before peer help", post: "After peer help" };

export type Level = (typeof LEVELS)[number]["value"];
