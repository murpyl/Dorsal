export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-red-600", selected: "bg-red-600 text-white border-red-600", dot: "bg-red-600" },
  { value: "partial", label: "Partly get it", color: "bg-yellow-400", selected: "bg-yellow-400 text-neutral-950 border-yellow-400", dot: "bg-yellow-400" },
  { value: "can_explain", label: "Can explain it", color: "bg-green-600", selected: "bg-green-600 text-white border-green-600", dot: "bg-green-600" },
] as const;

export type Phase = "pre" | "post";
/** `pre` = rating on the session page; `post` = rating updated inside a peer help room. Only the comparison panel shows these. */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before peer help", post: "After peer help" };

export type Level = (typeof LEVELS)[number]["value"];
