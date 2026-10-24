import type { Level, Phase } from "@/lib/levels";

/** One realistic CS 61A lecture used by every Timeline mockup screen. No Convex: plain data. */

export type Counts = Record<Level, number>;

export type Concept = {
  _id: string;
  label: string;
  description: string;
  order: number;
  x: number;
  y: number;
  counts: Counts;
  total: number;
  openClusters: number;
  /** Signals recorded after the instructor switched the phase (empty until then). */
  post: Counts;
  postTotal: number;
};

export type Question = {
  _id: string;
  conceptId: string;
  content: string;
  alias: string;
  createdAt: string;
  state: "pending" | "clustered" | "hidden";
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
  publishedAt?: string;
};

export type Member = {
  alias: string;
  role: "helper" | "learner";
  isMe?: boolean;
};

export type Room = {
  _id: string;
  title: string;
  conceptId: string;
  clusterId: string | null;
  capacity: number;
  members: Member[];
  openedAt: string;
};

export type Message = {
  _id: string;
  alias: string;
  body: string;
  at: string;
  isMine?: boolean;
};

export type StudentEvent =
  | { kind: "joined"; at: string }
  | { kind: "topic"; at: string; conceptId: string }
  | {
      kind: "asked";
      at: string;
      conceptId: string;
      content: string;
      clusterId: string | null;
    }
  | { kind: "cluster"; at: string; clusterId: string }
  | { kind: "room"; at: string; roomId: string };

export const session = {
  title: "CS 61A · Lecture 8: Recursion",
  code: "BLAHAJ",
  phase: "pre" as Phase,
  state: "open" as const,
  participantCount: 36,
  startedAt: "10:05",
  now: "10:52",
};

export const me = {
  alias: "gentle-yak",
  answers: {
    base: "can_explain",
    recursive: "can_explain",
    stack: "partial",
    tree: "confused",
  } as Partial<Record<string, Level>>,
  helperConceptIds: ["recursive"],
};

const tally = (confused: number, partial: number, can_explain: number): Pick<Concept, "counts" | "total"> => ({
  counts: { confused, partial, can_explain },
  total: confused + partial + can_explain,
});
const none: Counts = { confused: 0, partial: 0, can_explain: 0 };

export const concepts: Concept[] = [
  {
    _id: "base",
    label: "Base case",
    description: "The input for which the function answers directly, without calling itself.",
    order: 1,
    x: 0,
    y: 120,
    ...tally(6, 9, 19),
    openClusters: 1,
    post: none,
    postTotal: 0,
  },
  {
    _id: "recursive",
    label: "Recursive case",
    description: "Solving the problem by calling the same function on a smaller input and combining the result.",
    order: 2,
    x: 260,
    y: 120,
    ...tally(8, 13, 12),
    openClusters: 0,
    post: none,
    postTotal: 0,
  },
  {
    _id: "stack",
    label: "Call stack",
    description: "Each call waits in its own frame until the call below it returns.",
    order: 3,
    x: 520,
    y: 20,
    ...tally(15, 10, 6),
    openClusters: 1,
    post: none,
    postTotal: 0,
  },
  {
    _id: "tree",
    label: "Tree recursion",
    description: "A recursive case that makes more than one recursive call, like count_partitions.",
    order: 4,
    x: 520,
    y: 220,
    ...tally(12, 7, 3),
    openClusters: 0,
    post: none,
    postTotal: 0,
  },
  {
    _id: "mutual",
    label: "Mutual recursion",
    description: "Two functions that call each other, like is_even and is_odd.",
    order: 5,
    x: 780,
    y: 220,
    ...tally(5, 3, 1),
    openClusters: 0,
    post: none,
    postTotal: 0,
  },
  {
    _id: "iteration",
    label: "Recursion vs iteration",
    description: "When a loop and a recursive function compute the same thing, and what differs.",
    order: 6,
    x: 780,
    y: 20,
    ...tally(2, 1, 1),
    openClusters: 0,
    post: none,
    postTotal: 0,
  },
];

export const edges = [
  { _id: "e1", fromId: "base", toId: "recursive" },
  { _id: "e2", fromId: "recursive", toId: "stack" },
  { _id: "e3", fromId: "recursive", toId: "tree" },
  { _id: "e4", fromId: "tree", toId: "mutual" },
  { _id: "e5", fromId: "stack", toId: "iteration" },
];

export const activeConceptId = "tree";

export const conceptById = Object.fromEntries(concepts.map((c) => [c._id, c])) as Record<string, Concept>;
export const conceptLabel = (id: string) => conceptById[id]?.label ?? "Unknown concept";

export const questions: Question[] = [
  {
    _id: "q1",
    conceptId: "base",
    alias: "sleepy-fox",
    createdAt: "10:31",
    state: "pending",
    content: "If the base case returns 0, how does the final answer not end up being 0?",
  },
  {
    _id: "q2",
    conceptId: "recursive",
    alias: "amber-moth",
    createdAt: "10:35",
    state: "pending",
    content: "How is the recursive case different from a loop that runs the same code again?",
  },
  {
    _id: "q3",
    conceptId: "stack",
    alias: "misty-crane",
    createdAt: "10:38",
    state: "pending",
    content: "What happens to the frames after the base case returns? Do they get deleted one by one?",
  },
  {
    _id: "q4",
    conceptId: "base",
    alias: "bold-lemur",
    createdAt: "10:40",
    state: "pending",
    content: "Is it bad if a recursive function has two base cases?",
  },
  {
    _id: "q5",
    conceptId: "stack",
    alias: "quiet-otter",
    createdAt: "10:50",
    state: "pending",
    content: "Why does the stack get so deep for fib(30) when a loop is fine?",
  },
  {
    _id: "q6",
    conceptId: "stack",
    alias: "sunny-newt",
    createdAt: "10:33",
    state: "clustered",
    content: "How does the return value get back to the first call if each call only returns to the one before it?",
  },
  {
    _id: "q7",
    conceptId: "stack",
    alias: "brave-heron",
    createdAt: "10:34",
    state: "clustered",
    content: "When fact(1) returns, where does that 1 actually go?",
  },
  {
    _id: "q8",
    conceptId: "tree",
    alias: "pale-finch",
    createdAt: "10:49",
    state: "clustered",
    content: "Why does count_partitions call itself twice? Do both calls run at the same time?",
  },
  {
    _id: "q9",
    conceptId: "tree",
    alias: "wry-badger",
    createdAt: "10:50",
    state: "clustered",
    content: "In the tree diagram, which branch runs first, left or right?",
  },
  {
    _id: "q10",
    conceptId: "base",
    alias: "sleepy-fox",
    createdAt: "10:12",
    state: "clustered",
    content: "Why do we need a base case at all? Can't the function just stop when n is 0?",
  },
  {
    _id: "q11",
    conceptId: "base",
    alias: "amber-moth",
    createdAt: "10:14",
    state: "clustered",
    content: "Does the base case have to be the first line of the function?",
  },
  {
    _id: "q12",
    conceptId: "base",
    alias: "misty-crane",
    createdAt: "10:15",
    state: "clustered",
    content: "Why do we check n == 0 before doing anything else?",
  },
  {
    _id: "q13",
    conceptId: "stack",
    alias: "gentle-yak",
    createdAt: "10:36",
    state: "clustered",
    content: "Is the call stack a real thing in memory or just a drawing we use in lecture?",
  },
  {
    _id: "q14",
    conceptId: "stack",
    alias: "bold-lemur",
    createdAt: "10:37",
    state: "clustered",
    content: "Why do we draw frames on top of each other?",
  },
];

export const questionById = Object.fromEntries(questions.map((q) => [q._id, q])) as Record<string, Question>;

export const clusters: Cluster[] = [
  {
    _id: "c1",
    title: "Tracing recursive return values",
    summary: "Students lose track of how a value produced at the base case travels back through the earlier frames.",
    conceptIds: ["stack", "recursive"],
    questionIds: ["q6", "q7"],
    status: "suggested",
    source: "ai",
    confidence: 0.82,
    helperCount: 0,
  },
  {
    _id: "c2",
    title: "Two calls inside count_partitions",
    summary: "Confusion about order and concurrency when a recursive case makes two calls.",
    conceptIds: ["tree"],
    questionIds: ["q8", "q9"],
    status: "suggested",
    source: "ai",
    confidence: 0.64,
    helperCount: 0,
  },
  {
    _id: "c3",
    title: "When does the base case actually get hit?",
    summary: "The base case is read as a stopping rule but not as the first value that gets returned.",
    conceptIds: ["base"],
    questionIds: ["q10", "q11", "q12"],
    status: "published",
    source: "ai",
    confidence: 0.91,
    helperCount: 4,
    publishedAt: "10:41",
  },
  {
    _id: "c4",
    title: "What “the stack” is doing during recursion",
    summary: "Whether frames are a real runtime structure, and why we draw them stacked.",
    conceptIds: ["stack"],
    questionIds: ["q13", "q14"],
    status: "published",
    source: "manual",
    confidence: null,
    helperCount: 2,
    publishedAt: "10:46",
  },
];

export const clusterById = Object.fromEntries(clusters.map((c) => [c._id, c])) as Record<string, Cluster>;

export const rooms: Room[] = [
  {
    _id: "r1",
    title: "Base case · room 1",
    conceptId: "base",
    clusterId: "c3",
    capacity: 6,
    openedAt: "10:43",
    members: [
      { alias: "quiet-otter", role: "helper" },
      { alias: "brave-heron", role: "helper" },
      { alias: "sleepy-fox", role: "learner" },
      { alias: "gentle-yak", role: "learner", isMe: true },
      { alias: "misty-crane", role: "learner" },
    ],
  },
  {
    _id: "r2",
    title: "Call stack · room 1",
    conceptId: "stack",
    clusterId: "c4",
    capacity: 6,
    openedAt: "10:47",
    members: [
      { alias: "sunny-newt", role: "helper" },
      { alias: "bold-lemur", role: "learner" },
      { alias: "pale-finch", role: "learner" },
    ],
  },
];

export const roomById = Object.fromEntries(rooms.map((r) => [r._id, r])) as Record<string, Room>;

export const messages: Message[] = [
  {
    _id: "m1",
    alias: "quiet-otter",
    at: "10:44",
    body: "hey! where did you get stuck with the base case?",
  },
  {
    _id: "m2",
    alias: "sleepy-fox",
    at: "10:44",
    body: "I get that n == 0 stops it, but I don't get why fact(0) returning 1 doesn't make the whole answer 1",
  },
  {
    _id: "m3",
    alias: "quiet-otter",
    at: "10:45",
    body: "ok so fact(0) returns 1 to fact(1), which multiplies: 1 * 1. then fact(2) gets that and does 2 * 1, and so on back up",
  },
  {
    _id: "m4",
    alias: "brave-heron",
    at: "10:46",
    body: "try writing the frames as a column: fact(3) waits for fact(2), fact(2) waits for fact(1)… the base case just starts the unwinding",
  },
  {
    _id: "m5",
    alias: "gentle-yak",
    at: "10:47",
    isMine: true,
    body: "oh so the base case value is the *first* thing that gets multiplied, not the last",
  },
  {
    _id: "m6",
    alias: "quiet-otter",
    at: "10:47",
    body: "exactly. want to trace fact(4) together? you write the frames, I'll check",
  },
];

/** What the student has seen so far, oldest first; the pinned "now" card above the feed holds the current topic. */
export const studentEvents: StudentEvent[] = [
  { kind: "joined", at: "10:05" },
  { kind: "topic", at: "10:08", conceptId: "base" },
  { kind: "topic", at: "10:19", conceptId: "recursive" },
  { kind: "topic", at: "10:31", conceptId: "stack" },
  {
    kind: "asked",
    at: "10:36",
    conceptId: "stack",
    content: questionById.q13.content,
    clusterId: "c4",
  },
  { kind: "cluster", at: "10:41", clusterId: "c3" },
  { kind: "room", at: "10:43", roomId: "r1" },
  { kind: "cluster", at: "10:46", clusterId: "c4" },
  { kind: "room", at: "10:47", roomId: "r2" },
  { kind: "topic", at: "10:49", conceptId: "tree" },
];

/** Events at or after this time are "new since you last looked" on the student screen. */
export const studentSeenUntil = "10:45";

export const aiRun = {
  status: "ok" as const,
  model: "claude-sonnet-4-5",
  latencyMs: 2140,
  at: "10:51",
};
