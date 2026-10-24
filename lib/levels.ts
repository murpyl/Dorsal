export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-red-500", selected: "bg-red-500 text-white border-red-500", dot: "bg-red-500" },
  { value: "partial", label: "Partly get it", color: "bg-amber-400", selected: "bg-amber-400 text-amber-950 border-amber-400", dot: "bg-amber-400" },
  { value: "can_explain", label: "Can explain it", color: "bg-emerald-600", selected: "bg-emerald-600 text-white border-emerald-600", dot: "bg-emerald-600" },
] as const;

export type Phase = "pre" | "post";
/** `pre` = rating on the session page; `post` = rating updated inside a peer help room. Only the comparison panel shows these. */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before peer help", post: "After peer help" };

export type Level = (typeof LEVELS)[number]["value"];
