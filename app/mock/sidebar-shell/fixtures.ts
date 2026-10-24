import type { Level, Phase } from "@/lib/levels";

/** One CS 61A lecture, frozen mid-way through the "Call stack" segment, ~32 students in the room. */

export type Counts = Record<Level, number>;
export type Concept = {
  _id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  counts: Counts;
  post: Counts;
  total: number;
  openClusters: number;
  myLevel: Level | null;
};
export type Edge = { _id: string; fromId: string; toId: string };
export type Question = {
  _id: string;
  conceptId: string;
  alias: string;
  content: string;
  state: "pending" | "clustered";
  minutesAgo: number;
  isSimulated: boolean;
};
export type Cluster = {
  _id: string;
  title: string;
  summary: string;
  conceptIds: string[];
  questionIds: string[];
  status: "suggested" | "published";
  source: "ai" | "manual";
  confidence: number | null;
  helperCount: number;
  publishedMinutesAgo?: number;
};
export type Room = {
  _id: string;
  title: string;
  conceptId: string;
  clusterId: string | null;
  capacity: number;
  members: { alias: string; role: "helper" | "learner"; isMe?: boolean; isSimulated?: boolean }[];
  status: "open" | "closed";
  openedMinutesAgo: number;
};
export type Message = { _id: string; alias: string; body: string; isMine: boolean; minutesAgo: number };

const tally = (confused: number, partial: number, can_explain: number): Counts => ({ confused, partial, can_explain });
const sum = (c: Counts) => c.confused + c.partial + c.can_explain;

export const session = {
  title: "Recursion: how return values propagate",
  course: "CS 61A · Lecture 9",
  code: "RKQ7LA",
  phase: "pre" as Phase,
  state: "open" as const,
  participantCount: 34,
  simulatedCount: 30,
  activeConceptId: "call-stack",
  startedMinutesAgo: 27,
};

export const me = { alias: "quiet-otter", helperConceptIds: ["base-case"] };

const raw: Omit<Concept, "total">[] = [
  {
    _id: "base-case",
    label: "Base case",
    description: "The input that stops the recursion and returns a value directly.",
    x: 0,
    y: 90,
    counts: tally(3, 8, 21),
    post: tally(1, 2, 4),
    openClusters: 0,
    myLevel: "can_explain",
  },
  {
    _id: "recursive-case",
    label: "Recursive case",
    description: "Reducing the problem and calling the function on a smaller input.",
    x: 260,
    y: 90,
    counts: tally(6, 13, 12),
    post: tally(0, 0, 0),
    openClusters: 1,
    myLevel: "partial",
  },
  {
    _id: "call-stack",
    label: "Call stack",
    description: "Each call waits in its own frame until the call below it returns.",
    x: 520,
    y: 0,
    counts: tally(14, 11, 4),
    post: tally(3, 6, 9),
    openClusters: 1,
    myLevel: null,
  },
  {
    _id: "tree-recursion",
    label: "Tree recursion",
    description: "A function that makes more than one recursive call per invocation.",
    x: 520,
    y: 180,
    counts: tally(12, 7, 3),
    post: tally(0, 0, 0),
    openClusters: 0,
    myLevel: "confused",
  },
  {
    _id: "mutual-recursion",
    label: "Mutual recursion",
    description: "Two functions that call each other, like is_even / is_odd.",
    x: 780,
    y: 180,
    counts: tally(9, 6, 5),
    post: tally(0, 0, 0),
    openClusters: 0,
    myLevel: null,
  },
  {
    _id: "recursion-vs-iteration",
    label: "Recursion vs iteration",
    description: "When a loop and a recursive function compute the same thing.",
    x: 780,
    y: 0,
    counts: tally(2, 1, 1),
    post: tally(0, 0, 0),
    openClusters: 0,
    myLevel: null,
  },
];

export const concepts: Concept[] = raw.map((c) => ({ ...c, total: sum(c.counts) }));
export const conceptById = (id: string) => concepts.find((c) => c._id === id)!;

export const edges: Edge[] = [
  { _id: "e1", fromId: "base-case", toId: "recursive-case" },
  { _id: "e2", fromId: "recursive-case", toId: "call-stack" },
  { _id: "e3", fromId: "recursive-case", toId: "tree-recursion" },
  { _id: "e4", fromId: "tree-recursion", toId: "mutual-recursion" },
  { _id: "e5", fromId: "call-stack", toId: "recursion-vs-iteration" },
];

export const questions: Question[] = [
  { _id: "q1", conceptId: "call-stack", alias: "brisk-heron", content: "When fact(3) calls fact(2), where does the 3 go while we wait? Is it just gone until the return?", state: "clustered", minutesAgo: 14, isSimulated: true },
  { _id: "q2", conceptId: "call-stack", alias: "mellow-fox", content: "Why does the return value get multiplied on the way *back up* and not on the way down?", state: "clustered", minutesAgo: 13, isSimulated: true },
  { _id: "q3", conceptId: "call-stack", alias: "sunny-lynx", content: "Do all the frames exist at the same time or does each one replace the previous one?", state: "clustered", minutesAgo: 12, isSimulated: true },
  { _id: "q4", conceptId: "recursive-case", alias: "calm-walrus", content: "How do I know the smaller input will actually reach the base case? Is there a trick to check?", state: "clustered", minutesAgo: 11, isSimulated: true },
  { _id: "q5", conceptId: "recursive-case", alias: "witty-crane", content: "If I pass n-2 instead of n-1 does it still count as recursion or does it break?", state: "clustered", minutesAgo: 10, isSimulated: true },
  { _id: "q6", conceptId: "tree-recursion", alias: "gentle-moose", content: "In fib(5) why is fib(2) computed so many times? Doesn't Python remember it?", state: "pending", minutesAgo: 6, isSimulated: true },
  { _id: "q7", conceptId: "tree-recursion", alias: "shy-puffin", content: "Is the tree in 'tree recursion' a data structure we have to build, or just a drawing of the calls?", state: "pending", minutesAgo: 5, isSimulated: true },
  { _id: "q8", conceptId: "tree-recursion", alias: "bold-tapir", content: "Why are there two recursive calls in count_partitions and not one like in factorial?", state: "pending", minutesAgo: 4, isSimulated: true },
  { _id: "q9", conceptId: "call-stack", alias: "quiet-otter", content: "What happens to the stack if I forget the base case — does it just keep adding frames forever?", state: "pending", minutesAgo: 2, isSimulated: false },
  { _id: "q10", conceptId: "mutual-recursion", alias: "wry-gecko", content: "Can is_even and is_odd call each other forever? What stops them?", state: "pending", minutesAgo: 1, isSimulated: true },
];
export const questionById = (id: string) => questions.find((q) => q._id === id)!;

export const clusters: Cluster[] = [
  {
    _id: "c1",
    title: "Tracing recursive return values",
    summary: "Students lose track of what each frame holds while it waits, and why the arithmetic happens on the way back up.",
    conceptIds: ["call-stack"],
    questionIds: ["q1", "q2", "q3"],
    status: "published",
    source: "ai",
    confidence: 0.82,
    helperCount: 3,
    publishedMinutesAgo: 8,
  },
  {
    _id: "c2",
    title: "Will the recursive case reach the base case?",
    summary: "Uncertainty about how the argument shrinks and whether a different step size still terminates.",
    conceptIds: ["recursive-case", "base-case"],
    questionIds: ["q4", "q5"],
    status: "published",
    source: "manual",
    confidence: null,
    helperCount: 5,
    publishedMinutesAgo: 7,
  },
  {
    _id: "c3",
    title: "Repeated work in tree recursion",
    summary: "Why fib recomputes the same subproblems and what the 'tree' actually refers to.",
    conceptIds: ["tree-recursion"],
    questionIds: ["q6", "q7", "q8"],
    status: "suggested",
    source: "ai",
    confidence: 0.74,
    helperCount: 2,
  },
  {
    _id: "c4",
    title: "What stops infinite recursion?",
    summary: "Missing base cases and mutually recursive functions that never terminate.",
    conceptIds: ["call-stack", "mutual-recursion"],
    questionIds: ["q9", "q10"],
    status: "suggested",
    source: "ai",
    confidence: 0.61,
    helperCount: 1,
  },
];

export const rooms: Room[] = [
  {
    _id: "r1",
    title: "Tracing recursive return values",
    conceptId: "call-stack",
    clusterId: "c1",
    capacity: 6,
    status: "open",
    openedMinutesAgo: 6,
    members: [
      { alias: "sunny-lynx", role: "helper", isSimulated: true },
      { alias: "brisk-heron", role: "learner", isSimulated: true },
      { alias: "mellow-fox", role: "learner", isSimulated: true },
      { alias: "quiet-otter", role: "learner", isMe: true },
      { alias: "calm-walrus", role: "learner", isSimulated: true },
    ],
  },
  {
    _id: "r2",
    title: "Tree recursion walk-through",
    conceptId: "tree-recursion",
    clusterId: null,
    capacity: 6,
    status: "open",
    openedMinutesAgo: 3,
    members: [
      { alias: "witty-crane", role: "helper", isSimulated: true },
      { alias: "gentle-moose", role: "learner", isSimulated: true },
    ],
  },
];

export const roomMessages: Message[] = [
  { _id: "m1", alias: "sunny-lynx", body: "Hey all. Easiest way I think about it: every call is a sticky note on a pile. fact(3) writes '3 × ?' and waits.", isMine: false, minutesAgo: 5 },
  { _id: "m2", alias: "brisk-heron", body: "ok so the 3 isn't gone, it's on the note waiting for the ? to be filled in", isMine: false, minutesAgo: 5 },
  { _id: "m3", alias: "sunny-lynx", body: "Exactly. fact(2) puts its own note on top: '2 × ?'. Then fact(1) hits the base case and returns 1 — no note needed.", isMine: false, minutesAgo: 4 },
  { _id: "m4", alias: "quiet-otter", body: "so the multiplication only happens once a note comes off the pile? that's why it's 'on the way back up'", isMine: true, minutesAgo: 3 },
  { _id: "m5", alias: "sunny-lynx", body: "Yes! Top note: 2 × 1 = 2, comes off. Next: 3 × 2 = 6, comes off. The pile is the call stack.", isMine: false, minutesAgo: 2 },
  { _id: "m6", alias: "mellow-fox", body: "that finally clicked, the frames all exist at once until they return 🙏", isMine: false, minutesAgo: 1 },
];

export const aiRun = { status: "ok" as const, model: "claude-sonnet-4-5", latencyMs: 2310, minutesAgo: 9 };

export const initials = (alias: string) =>
  alias
    .split("-")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/** Deterministic pastel per alias so the avatar stack is stable across screens. */
export const aliasHue = (alias: string) => {
  let h = 0;
  for (const ch of alias) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};
