export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-red-500" },
  { value: "partial", label: "Partly get it", color: "bg-amber-400" },
  { value: "can_explain", label: "Can explain it", color: "bg-emerald-500" },
] as const;

export type Phase = "pre" | "post";
/** `pre` = rating on the session page; `post` = rating updated inside a peer help room. Only the comparison panel shows these. */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before peer help", post: "After peer help" };

export type Level = (typeof LEVELS)[number]["value"];
