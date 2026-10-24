import type { Level, Phase } from "@/lib/levels";

/** One CS 61A recursion lecture, ~12 minutes in. All numbers are made up but internally consistent. */

export type Counts = Record<Level, number>;
export type Tally = { counts: Counts; total: number };

export type Concept = {
  _id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  counts: Counts;
  total: number;
  openClusters: number;
  post: Tally;
  myLevel: Level | null;
};

const tally = (confused: number, partial: number, can_explain: number): Tally => ({
  counts: { confused, partial, can_explain },
  total: confused + partial + can_explain,
});

const concept = (
  _id: string,
  label: string,
  description: string,
  [x, y]: [number, number],
  pre: [number, number, number],
  post: [number, number, number],
  openClusters: number,
  myLevel: Level | null,
): Concept => ({ _id, label, description, x, y, ...tally(...pre), openClusters, post: tally(...post), myLevel });

export const SESSION = {
  code: "RCRSN7",
  title: "CS 61A · Recursion: how return values propagate",
  phase: "pre" as Phase,
  state: "open" as const,
  activeConceptId: "stack",
  participantCount: 34,
  simulatedCount: 0,
  startedAt: "11:52",
  now: "12:06",
};

export const CONCEPTS: Concept[] = [
  concept("base", "Base case", "The input the function answers directly, without calling itself.", [0, 90], [3, 7, 16], [0, 0, 0], 0, "can_explain"),
  concept("recur", "Recursive case", "The call that shrinks the problem and trusts the smaller answer.", [270, 90], [6, 13, 12], [0, 0, 0], 1, "partial"),
  concept("stack", "Call stack", "Each call waits in its own frame until the call it made returns.", [540, 0], [17, 11, 6], [2, 3, 4], 1, "confused"),
  concept("tree", "Tree recursion", "More than one recursive call per frame, e.g. fib(n-1) + fib(n-2).", [540, 180], [12, 8, 4], [0, 0, 0], 1, null),
  concept("mutual", "Mutual recursion", "Two functions that call each other, like is_even and is_odd.", [810, 180], [9, 7, 3], [0, 0, 0], 0, null),
  concept("iter", "Recursion vs iteration", "Every recursive function has an iterative twin; when to pick which.", [810, 0], [5, 9, 8], [0, 0, 0], 0, "partial"),
];

export const EDGES = [
  { _id: "e1", fromId: "base", toId: "recur" },
  { _id: "e2", fromId: "recur", toId: "stack" },
  { _id: "e3", fromId: "recur", toId: "tree" },
  { _id: "e4", fromId: "tree", toId: "mutual" },
  { _id: "e5", fromId: "recur", toId: "iter" },
];

export const conceptById = (id: string) => CONCEPTS.find((c) => c._id === id)!;

export type Question = {
  _id: string;
  conceptId: string;
  content: string;
  alias: string;
  at: string;
  state: "pending" | "clustered";
};

export const QUESTIONS: Question[] = [
  { _id: "q1", conceptId: "stack", content: "When factorial(3) calls factorial(2), does factorial(3) keep running or does it pause?", alias: "brisk-heron", at: "12:05", state: "pending" },
  { _id: "q11", conceptId: "stack", content: "What does “maximum recursion depth exceeded” mean in terms of frames?", alias: "tidy-crane", at: "12:04", state: "pending" },
  { _id: "q10", conceptId: "mutual", content: "In is_even / is_odd, which one has the “real” base case?", alias: "bold-yak", at: "12:03", state: "pending" },
  { _id: "q9", conceptId: "iter", content: "Is a while loop always faster than recursion in Python?", alias: "sunny-lynx", at: "12:02", state: "clustered" },
  { _id: "q7", conceptId: "base", content: "Does the base case have to be the first line of the function?", alias: "calm-newt", at: "12:01", state: "clustered" },
  { _id: "q8", conceptId: "base", content: "What happens if I forget the base case — does Python just crash?", alias: "mellow-fox", at: "12:00", state: "clustered" },
  { _id: "q5", conceptId: "tree", content: "Why does fib(30) take so long if each call only does one addition?", alias: "quiet-otter", at: "11:59", state: "clustered" },
  { _id: "q6", conceptId: "tree", content: "Does fib call itself twice at the same time, or one after the other?", alias: "brisk-heron", at: "11:58", state: "clustered" },
  { _id: "q2", conceptId: "stack", content: "Where does the return value actually go after the base case returns 1?", alias: "mellow-fox", at: "11:57", state: "clustered" },
  { _id: "q3", conceptId: "stack", content: "Why does the trace show the multiplications happening “backwards”?", alias: "calm-newt", at: "11:56", state: "clustered" },
  { _id: "q4", conceptId: "recur", content: "Is the recursive call's result just a variable I can use like any other?", alias: "tidy-crane", at: "11:55", state: "clustered" },
];

export const questionById = (id: string) => QUESTIONS.find((q) => q._id === id)!;

export type Cluster = {
  _id: string;
  status: "suggested" | "published";
  title: string;
  summary: string;
  conceptIds: string[];
  questionIds: string[];
  confidence: number;
  helperCount: number;
  publishedAt: string | null;
};

export const CLUSTERS: Cluster[] = [
  {
    _id: "c1",
    status: "published",
    title: "Tracing recursive return values",
    summary: "Students lose track of a value once the base case returns; frames seem to run “backwards”.",
    conceptIds: ["stack", "recur"],
    questionIds: ["q2", "q3", "q4"],
    confidence: 0.82,
    helperCount: 3,
    publishedAt: "11:59",
  },
  {
    _id: "c2",
    status: "published",
    title: "Why tree recursion is slow",
    summary: "fib's two calls per frame are read as “one addition”; the branching isn't visible.",
    conceptIds: ["tree"],
    questionIds: ["q5", "q6"],
    confidence: 0.74,
    helperCount: 1,
    publishedAt: "12:02",
  },
  {
    _id: "c3",
    status: "suggested",
    title: "Where the base case goes",
    summary: "Whether the base case must come first, and what happens without one.",
    conceptIds: ["base", "recur"],
    questionIds: ["q7", "q8"],
    confidence: 0.69,
    helperCount: 4,
    publishedAt: null,
  },
  {
    _id: "c4",
    status: "suggested",
    title: "Is iteration always faster?",
    summary: "Performance intuition about loops vs recursion in Python.",
    conceptIds: ["iter"],
    questionIds: ["q9"],
    confidence: 0.55,
    helperCount: 2,
    publishedAt: null,
  },
];

export const AI_RUN = { model: "claude-sonnet-4-5", latencyMs: 1840, at: "12:02", pendingAtRun: 2 };

export type Room = {
  _id: string;
  title: string;
  conceptId: string;
  clusterId: string | null;
  capacity: number;
  memberCount: number;
  helperCount: number;
  status: "open" | "closed";
  isMember: boolean;
  myRole: "helper" | "learner" | null;
  openedAt: string;
};

export const ROOMS: Room[] = [
  { _id: "r1", title: "Call stack trace: factorial(3)", conceptId: "stack", clusterId: "c1", capacity: 6, memberCount: 5, helperCount: 1, status: "open", isMember: true, myRole: "learner", openedAt: "12:00" },
  { _id: "r2", title: "fib tree walk", conceptId: "tree", clusterId: "c2", capacity: 6, memberCount: 2, helperCount: 1, status: "open", isMember: false, myRole: null, openedAt: "12:03" },
];

export const ME = { alias: "brisk-heron", helperConceptIds: ["base"] };

export type Member = { alias: string; role: "helper" | "learner"; isMe?: boolean };

export const ROOM_MEMBERS: Member[] = [
  { alias: "quiet-otter", role: "helper" },
  { alias: "brisk-heron", role: "learner", isMe: true },
  { alias: "mellow-fox", role: "learner" },
  { alias: "calm-newt", role: "learner" },
  { alias: "sunny-lynx", role: "learner" },
];

export type Message =
  | { _id: string; kind: "chat"; alias: string; isMine: boolean; body: string; at: string }
  | { _id: string; kind: "system"; body: string; at: string };

export const MESSAGES: Message[] = [
  { _id: "m0", kind: "system", body: "quiet-otter opened this room for “Tracing recursive return values”.", at: "12:00" },
  { _id: "m1", kind: "chat", alias: "quiet-otter", isMine: false, body: "Hey all — let's trace factorial(3) one frame at a time. What does factorial(3) do first?", at: "12:00" },
  { _id: "m2", kind: "chat", alias: "brisk-heron", isMine: true, body: "It calls factorial(2)? But I don't get what factorial(3) is doing while that runs.", at: "12:01" },
  { _id: "m3", kind: "chat", alias: "quiet-otter", isMine: false, body: "It's paused on `3 * factorial(2)`. The frame stays on the stack holding the 3 until factorial(2) returns.", at: "12:01" },
  { _id: "m4", kind: "chat", alias: "mellow-fox", isMine: false, body: "So there are three frames stacked up before anything gets multiplied?", at: "12:02" },
  { _id: "m5", kind: "chat", alias: "quiet-otter", isMine: false, body: "Exactly. factorial(1) returns 1, then factorial(2) finishes 2*1, then factorial(3) finishes 3*2. The multiplications run on the way back.", at: "12:03" },
  { _id: "m6", kind: "system", body: "sunny-lynx joined as a learner · 5 / 6", at: "12:04" },
  { _id: "m7", kind: "chat", alias: "calm-newt", isMine: false, body: "ohh that's why the trace prints the small ones first. ok that makes sense", at: "12:04" },
  { _id: "m8", kind: "system", body: "Instructor switched signals to After help (post). Check in below when you're ready.", at: "12:05" },
];

export type Activity = { at: string; text: string; kind: "question" | "cluster" | "room" | "topic" | "signal" };

export const ACTIVITY: Activity[] = [
  { at: "12:05", text: "brisk-heron asked about Call stack", kind: "question" },
  { at: "12:04", text: "tidy-crane asked about Call stack", kind: "question" },
  { at: "12:03", text: "Room “fib tree walk” opened (quiet-otter, helper)", kind: "room" },
  { at: "12:02", text: "Claude suggested 2 clusters from 3 pending questions", kind: "cluster" },
  { at: "12:02", text: "Published “Why tree recursion is slow”", kind: "cluster" },
  { at: "12:00", text: "Room “Call stack trace: factorial(3)” opened · now 5 / 6", kind: "room" },
  { at: "11:59", text: "Published “Tracing recursive return values”", kind: "cluster" },
  { at: "11:58", text: "Current topic → Call stack", kind: "topic" },
];
