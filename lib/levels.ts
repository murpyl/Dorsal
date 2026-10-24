export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-rose-400", selected: "bg-rose-100 text-rose-950 border-rose-400", dot: "bg-rose-400" },
  { value: "partial", label: "Partly get it", color: "bg-amber-300", selected: "bg-amber-100 text-amber-950 border-amber-400", dot: "bg-amber-400" },
  { value: "can_explain", label: "Can explain it", color: "bg-emerald-400", selected: "bg-emerald-100 text-emerald-950 border-emerald-400", dot: "bg-emerald-400" },
] as const;

export type Phase = "pre" | "post";
/** `pre` = rating on the session page; `post` = rating updated inside a peer help room. Only the comparison panel shows these. */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before peer help", post: "After peer help" };

export type Level = (typeof LEVELS)[number]["value"];
