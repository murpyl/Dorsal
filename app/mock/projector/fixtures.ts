import type { Level, Phase } from "@/lib/levels";

/**
 * One realistic CS 61A lecture, frozen at minute 28: the instructor has just moved on to the call stack,
 * two clusters are published, two more are waiting for review and two help rooms are open.
 * Pure data — no Convex, no ids that mean anything outside these mock screens.
 */

export type Counts = Record<Level, number>;

export type Concept = {
  _id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  counts: Counts;
  total: number;
  openClusters: number;
  /** The student's own answer on this concept (student screen only). */
  myLevel: Level | null;
  post: Counts;
  postTotal: number;
};

export type Question = {
  _id: string;
  content: string;
  conceptId: string;
  createdAt: string;
  state: "pending" | "clustered" | "hidden";
  isSimulated: boolean;
};

export type Cluster = {
  _id: string;
  title: string;
  summary: string;
  conceptIds: string[];
  status: "suggested" | "published";
  source: "ai" | "manual";
  confidence: number | null;
  questionIds: string[];
  helperCount: number;
  publishedAt?: string;
};

export type Room = {
  _id: string;
  title: string;
  conceptId: string;
  clusterId: string | null;
  capacity: number;
  members: { alias: string; role: "helper" | "learner"; isMe?: boolean; isSimulated?: boolean }[];
  isMember: boolean;
  myRole: "helper" | "learner" | null;
};

export type Message = { _id: string; alias: string; isMine: boolean; body: string; at: string; isSimulated?: boolean };

export const session = {
  code: "KQ7MDA",
  title: "CS 61A · Lecture 9: Recursion",
  joinHost: "classpulse.app/join",
  phase: "pre" as Phase,
  state: "open" as const,
  participantCount: 37,
  simulatedCount: 0,
  activeConceptId: "call-stack",
  me: { alias: "quiet-otter", helperConceptIds: ["base-case", "recursive-case"] },
};

export const concepts: Concept[] = [
  {
    _id: "base-case",
    label: "Base case",
    description: "The input for which the function answers directly, without calling itself.",
    x: 0,
    y: 120,
    counts: { confused: 3, partial: 9, can_explain: 24 },
    total: 36,
    openClusters: 0,
    myLevel: "can_explain",
    post: { confused: 0, partial: 0, can_explain: 0 },
    postTotal: 0,
  },
  {
    _id: "recursive-case",
    label: "Recursive case",
    description: "Reduce the problem, call the function on the smaller problem, combine the result.",
    x: 320,
    y: 120,
    counts: { confused: 8, partial: 15, can_explain: 12 },
    total: 35,
    openClusters: 1,
    myLevel: "partial",
    post: { confused: 0, partial: 0, can_explain: 0 },
    postTotal: 0,
  },
  {
    _id: "call-stack",
    label: "Call stack",
    description: "Each call gets its own frame; frames are unwound as values return.",
    x: 640,
    y: 0,
    counts: { confused: 17, partial: 10, can_explain: 4 },
    total: 31,
    openClusters: 2,
    myLevel: null,
    post: { confused: 2, partial: 4, can_explain: 3 },
    postTotal: 9,
  },
  {
    _id: "tree-recursion",
    label: "Tree recursion",
    description: "More than one recursive call per invocation, e.g. fib(n-1) + fib(n-2).",
    x: 640,
    y: 240,
    counts: { confused: 11, partial: 8, can_explain: 3 },
    total: 22,
    openClusters: 1,
    myLevel: null,
    post: { confused: 0, partial: 0, can_explain: 0 },
    postTotal: 0,
  },
  {
    _id: "mutual-recursion",
    label: "Mutual recursion",
    description: "Two functions that call each other, like is_even / is_odd.",
    x: 960,
    y: 240,
    counts: { confused: 2, partial: 1, can_explain: 0 },
    total: 3,
    openClusters: 0,
    myLevel: null,
    post: { confused: 0, partial: 0, can_explain: 0 },
    postTotal: 0,
  },
  {
    _id: "rec-vs-iter",
    label: "Recursion vs iteration",
    description: "Converting between a loop with state and a recursive function with arguments.",
    x: 960,
    y: 0,
    counts: { confused: 6, partial: 12, can_explain: 9 },
    total: 27,
    openClusters: 0,
    myLevel: null,
    post: { confused: 0, partial: 0, can_explain: 0 },
    postTotal: 0,
  },
];

export const edges = [
  { _id: "e1", fromId: "base-case", toId: "recursive-case" },
  { _id: "e2", fromId: "recursive-case", toId: "call-stack" },
  { _id: "e3", fromId: "recursive-case", toId: "tree-recursion" },
  { _id: "e4", fromId: "tree-recursion", toId: "mutual-recursion" },
  { _id: "e5", fromId: "call-stack", toId: "rec-vs-iter" },
];

export const questions: Question[] = [
  { _id: "q1", content: "When fact(3) calls fact(2), does fact(3) just… wait? Where does its 3 go in the meantime?", conceptId: "call-stack", createdAt: "10:12", state: "clustered", isSimulated: false },
  { _id: "q2", content: "Why does the return value come back in reverse order? Which frame actually does the multiplication?", conceptId: "call-stack", createdAt: "10:13", state: "clustered", isSimulated: false },
  { _id: "q3", content: "Is the stack the same thing as the environment diagram boxes from lecture 4?", conceptId: "call-stack", createdAt: "10:14", state: "clustered", isSimulated: false },
  { _id: "q4", content: "If I forget the base case does Python just crash or does it loop forever?", conceptId: "base-case", createdAt: "10:15", state: "clustered", isSimulated: false },
  { _id: "q5", content: "What does RecursionError: maximum recursion depth exceeded actually mean, is 1000 frames the limit?", conceptId: "call-stack", createdAt: "10:18", state: "pending", isSimulated: false },
  { _id: "q6", content: "Can the base case be something other than n == 0? Like a list being empty?", conceptId: "base-case", createdAt: "10:19", state: "pending", isSimulated: false },
  { _id: "q7", content: "Why does fib(5) call fib(3) twice? Doesn't it remember the answer?", conceptId: "tree-recursion", createdAt: "10:21", state: "pending", isSimulated: false },
  { _id: "q8", content: "How many total calls does fib(n) make, is it 2^n or something smaller?", conceptId: "tree-recursion", createdAt: "10:22", state: "pending", isSimulated: false },
  { _id: "q9", content: "For count_partitions why are there two recursive calls, I only see one 'smaller' problem", conceptId: "tree-recursion", createdAt: "10:24", state: "pending", isSimulated: false },
  { _id: "q10", content: "Is every loop convertible to recursion or only the ones with a counter?", conceptId: "rec-vs-iter", createdAt: "10:26", state: "pending", isSimulated: false },
];

export const clusters: Cluster[] = [
  {
    _id: "c1",
    title: "Tracing recursive return values",
    summary: "Where a frame's local values live while the inner call runs, and which frame combines the returned result.",
    conceptIds: ["call-stack", "recursive-case"],
    status: "published",
    source: "ai",
    confidence: 0.82,
    questionIds: ["q1", "q2"],
    helperCount: 3,
    publishedAt: "10:16",
  },
  {
    _id: "c2",
    title: "Stack frames vs environment diagrams",
    summary: "Students are mapping the call stack onto the environment-diagram frames from earlier lectures and want to know if they are the same object.",
    conceptIds: ["call-stack"],
    status: "published",
    source: "manual",
    confidence: null,
    questionIds: ["q3", "q4"],
    helperCount: 1,
    publishedAt: "10:17",
  },
  {
    _id: "c3",
    title: "Why tree recursion repeats work",
    summary: "Repeated subcalls in fib and count_partitions; the class wants to know why the same input is computed more than once and how many calls there are.",
    conceptIds: ["tree-recursion"],
    status: "suggested",
    source: "ai",
    confidence: 0.76,
    questionIds: ["q7", "q8", "q9"],
    helperCount: 0,
  },
  {
    _id: "c4",
    title: "What counts as a base case",
    summary: "Whether base cases must be numeric and what happens when one is missing (RecursionError).",
    conceptIds: ["base-case", "call-stack"],
    status: "suggested",
    source: "ai",
    confidence: 0.61,
    questionIds: ["q5", "q6"],
    helperCount: 2,
  },
];

export const rooms: Room[] = [
  {
    _id: "r1",
    title: "Tracing recursive return values",
    conceptId: "call-stack",
    clusterId: "c1",
    capacity: 6,
    members: [
      { alias: "brisk-heron", role: "helper" },
      { alias: "quiet-otter", role: "learner", isMe: true },
      { alias: "mellow-fox", role: "learner" },
      { alias: "sunny-badger", role: "learner" },
      { alias: "calm-lynx", role: "helper" },
    ],
    isMember: true,
    myRole: "learner",
  },
  {
    _id: "r2",
    title: "Stack frames vs environment diagrams",
    conceptId: "call-stack",
    clusterId: "c2",
    capacity: 6,
    members: [
      { alias: "gentle-crane", role: "helper" },
      { alias: "bright-newt", role: "learner" },
    ],
    isMember: false,
    myRole: null,
  },
];

export const messages: Message[] = [
  { _id: "m1", alias: "brisk-heron", isMine: false, body: "ok so fact(3): before it can return anything it has to know fact(2). so it pauses and a new frame for fact(2) goes on top.", at: "10:31" },
  { _id: "m2", alias: "quiet-otter", isMine: true, body: "right but then where does the 3 live while fact(2) runs? does it get overwritten?", at: "10:31" },
  { _id: "m3", alias: "brisk-heron", isMine: false, body: "no — each frame has its own n. fact(3)'s frame still has n=3, it's just not the active frame. the stack is literally a stack of those boxes.", at: "10:32" },
  { _id: "m4", alias: "mellow-fox", isMine: false, body: "so the multiplication 3 * fact(2) happens in the fact(3) frame AFTER fact(2) returns 2?", at: "10:32" },
  { _id: "m5", alias: "calm-lynx", isMine: false, body: "exactly. the return values come back down the stack: fact(1)=1 → fact(2)=2 → fact(3)=6. that's why it looks 'reversed'.", at: "10:33" },
  { _id: "m6", alias: "quiet-otter", isMine: true, body: "ohh. so 'unwinding' is just each paused frame finishing its one multiplication. that clicks.", at: "10:33" },
];

export const conceptById = Object.fromEntries(concepts.map((c) => [c._id, c])) as Record<string, Concept>;
export const questionById = Object.fromEntries(questions.map((q) => [q._id, q])) as Record<string, Question>;
export const labelsFor = (ids: string[]) => ids.map((id) => conceptById[id]?.label ?? id);
export const pendingQuestions = questions.filter((q) => q.state === "pending");
export const totals = {
  responses: concepts.reduce((s, c) => s + c.total, 0),
  confused: concepts.reduce((s, c) => s + c.counts.confused, 0),
  published: clusters.filter((c) => c.status === "published").length,
  suggested: clusters.filter((c) => c.status === "suggested").length,
};
