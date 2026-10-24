export const LEVELS = [
  { value: "confused", label: "Confused", color: "bg-rose-500", selected: "bg-rose-600 text-white border-rose-600", dot: "bg-rose-500", text: "text-rose-600" },
  { value: "partial", label: "Partly get it", color: "bg-amber-400", selected: "bg-amber-400 text-amber-950 border-amber-400", dot: "bg-amber-400", text: "text-amber-700" },
  { value: "can_explain", label: "Can explain it", color: "bg-teal-500", selected: "bg-teal-700 text-white border-teal-700", dot: "bg-teal-500", text: "text-teal-700" },
] as const;

export type Phase = "pre" | "post";
/** `pre` = rating on the session page; `post` = rating updated inside a peer help room. Only the comparison panel shows these. */
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before peer help", post: "After peer help" };

export type Level = (typeof LEVELS)[number]["value"];
