export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-rose-500", selected: "bg-rose-100 text-rose-950 border-rose-400", dot: "bg-rose-500" },
  { value: "partial", label: "Partly get it", color: "bg-amber-400", selected: "bg-amber-100 text-amber-950 border-amber-400", dot: "bg-amber-400" },
  { value: "can_explain", label: "Can explain it", color: "bg-teal-500", selected: "bg-teal-100 text-teal-950 border-teal-500", dot: "bg-teal-500" },
] as const;

export type Phase = "pre" | "post";
/** `pre` = rating on the session page; `post` = rating updated inside a peer help room. Only the comparison panel shows these. */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before peer help", post: "After peer help" };

export type Level = (typeof LEVELS)[number]["value"];
