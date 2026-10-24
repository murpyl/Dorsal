export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-rose-300", selected: "bg-rose-300 text-rose-950 border-rose-300", dot: "bg-rose-300" },
  { value: "partial", label: "Partly get it", color: "bg-amber-300", selected: "bg-amber-300 text-amber-950 border-amber-300", dot: "bg-amber-300" },
  { value: "can_explain", label: "Can explain it", color: "bg-emerald-300", selected: "bg-emerald-300 text-emerald-950 border-emerald-300", dot: "bg-emerald-300" },
] as const;

export type Phase = "pre" | "post";
/** `pre` = rating on the session page; `post` = rating updated inside a peer help room. Only the comparison panel shows these. */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before peer help", post: "After peer help" };

export type Level = (typeof LEVELS)[number]["value"];
