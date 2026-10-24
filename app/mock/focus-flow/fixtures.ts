import type { Level, Phase } from "@/lib/levels";

/** One CS 61A recursion lecture, frozen at 10:46 while the instructor is on "Call stack". */

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
};
export type Edge = { _id: string; fromId: string; toId: string };
export type Question = {
  _id: string;
  conceptId: string;
  content: string;
  state: "pending" | "clustered";
  time: string;
  alias: string;
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
  time: string;
};
export type Room = {
  _id: string;
  title: string;
  conceptId: string;
  clusterId: string | null;
  capacity: number;
  memberCount: number;
  helperCount: number;
  isMember: boolean;
  myRole: "helper" | "learner" | null;
  time: string;
};
export type Member = { alias: string; role: "helper" | "learner"; isMe: boolean; isSimulated: boolean };
export type Message = { _id: string; authorAlias: string; body: string; isMine: boolean; time: string };

export const session = {
  title: "Recursion: how return values propagate",
  course: "CS 61A · Lecture 9",
  code: "FJORDS",
  phase: "pre" as Phase,
  state: "open" as const,
  participantCount: 34,
  simulatedCount: 24,
  activeConceptId: "c3",
  me: { alias: "quiet-otter", helperConceptIds: ["c1"] },
};

const tally = (confused: number, partial: number, can_explain: number) => ({
  counts: { confused, partial, can_explain },
  total: confused + partial + can_explain,
});

export const concepts: Concept[] = [
  {
    _id: "c1",
    label: "Base case",
    description: "The smallest input you answer directly, without another recursive call.",
    x: 0,
    y: 90,
    ...tally(4, 9, 19),
    openClusters: 2,
  },
  {
    _id: "c2",
    label: "Recursive case",
    description: "Shrink the problem, trust the smaller call, combine its result with the current step.",
    x: 270,
    y: 0,
    ...tally(7, 13, 12),
    openClusters: 1,
  },
  {
    _id: "c3",
    label: "Call stack",
    description: "Each call gets its own frame; the frame stays until its return value is handed back to the caller.",
    x: 270,
    y: 180,
    ...tally(15, 11, 6),
    openClusters: 0,
  },
  {
    _id: "c4",
    label: "Tree recursion",
    description: "A function that calls itself more than once per step, like fib(n) = fib(n-1) + fib(n-2).",
    x: 540,
    y: 0,
    ...tally(9, 7, 5),
    openClusters: 0,
  },
  {
    _id: "c5",
    label: "Mutual recursion",
    description: "Two functions that call each other, such as is_even and is_odd.",
    x: 540,
    y: 180,
    ...tally(2, 1, 1),
    openClusters: 0,
  },
  {
    _id: "c6",
    label: "Recursion vs iteration",
    description: "When a loop and a recursive function compute the same thing, and what differs in the environment.",
    x: 810,
    y: 90,
    ...tally(5, 10, 11),
    openClusters: 0,
  },
];

export const edges: Edge[] = [
  { _id: "e1", fromId: "c1", toId: "c2" },
  { _id: "e2", fromId: "c2", toId: "c3" },
  { _id: "e3", fromId: "c2", toId: "c4" },
  { _id: "e4", fromId: "c4", toId: "c5" },
  { _id: "e5", fromId: "c3", toId: "c6" },
];

export const conceptById = (id: string | null | undefined) => concepts.find((c) => c._id === id) ?? null;

/** The signed-in student's own answers (the only per-person data a student ever sees). */
export const myLevels: Record<string, Level | null> = {
  c1: "can_explain",
  c2: "partial",
  c3: null,
  c4: null,
  c5: null,
  c6: "partial",
};

export const questions: Question[] = [
  { _id: "q6", conceptId: "c1", content: "Can there be two base cases?", state: "clustered", time: "10:29", alias: "sunny-lynx", isSimulated: true },
  { _id: "q7", conceptId: "c1", content: "what happens if I forget the base case lol", state: "clustered", time: "10:30", alias: "mellow-fox", isSimulated: true },
  {
    _id: "q5",
    conceptId: "c2",
    content: "How do I know what to put in the recursive case vs the base case?",
    state: "clustered",
    time: "10:31",
    alias: "brisk-heron",
    isSimulated: true,
  },
  {
    _id: "q10",
    conceptId: "c2",
    content: "Does the recursive case have to make the problem smaller every single time?",
    state: "clustered",
    time: "10:32",
    alias: "calm-walrus",
    isSimulated: true,
  },
  {
    _id: "q1",
    conceptId: "c3",
    content: "When the recursive call returns, where does the value actually go? Does it go back into the same frame?",
    state: "pending",
    time: "10:42",
    alias: "quiet-otter",
    isSimulated: false,
  },
  { _id: "q2", conceptId: "c3", content: "Why does the stack unwind in reverse order?", state: "pending", time: "10:43", alias: "keen-puffin", isSimulated: true },
  {
    _id: "q3",
    conceptId: "c3",
    content: "I don't get what 'frame' means — is it a copy of the whole function?",
    state: "pending",
    time: "10:43",
    alias: "dusty-moth",
    isSimulated: true,
  },
  {
    _id: "q4",
    conceptId: "c3",
    content: "If I'm 5 recursive calls deep, are there 5 copies of n sitting around?",
    state: "pending",
    time: "10:44",
    alias: "amber-crane",
    isSimulated: true,
  },
  {
    _id: "q8",
    conceptId: "c4",
    content: "In tree recursion why do we add the two calls instead of just returning one of them?",
    state: "pending",
    time: "10:45",
    alias: "sunny-lynx",
    isSimulated: true,
  },
  {
    _id: "q9",
    conceptId: "c4",
    content: "fib(5) draws a tree on the slide but where does the tree live in memory??",
    state: "pending",
    time: "10:46",
    alias: "mellow-fox",
    isSimulated: true,
  },
];

export const questionById = (id: string) => questions.find((q) => q._id === id)!;

export const clusters: Cluster[] = [
  {
    _id: "k1",
    title: "Choosing the base case vs the recursive case",
    summary: "Students can state both parts but are unsure which input belongs where, and whether the recursive step must always shrink the input.",
    conceptIds: ["c1", "c2"],
    questionIds: ["q5", "q6", "q10"],
    status: "published",
    source: "ai",
    confidence: 0.86,
    helperCount: 3,
    time: "10:36",
  },
  {
    _id: "k2",
    title: "What happens without a base case",
    summary: "Infinite recursion and the RecursionError are not yet connected to the missing stopping condition.",
    conceptIds: ["c1"],
    questionIds: ["q7"],
    status: "published",
    source: "manual",
    confidence: null,
    helperCount: 2,
    time: "10:37",
  },
  {
    _id: "k3",
    title: "Where a return value goes when a frame finishes",
    summary: "Several students cannot picture the returned value flowing back into the caller's frame, and equate call depth with copies of n.",
    conceptIds: ["c3"],
    questionIds: ["q1", "q2", "q4"],
    status: "suggested",
    source: "ai",
    confidence: 0.82,
    helperCount: 0,
    time: "10:45",
  },
  {
    _id: "k4",
    title: "Tree recursion as a sum of sub-calls",
    summary: "Confusion about why fib adds both recursive results and what the 'tree' is physically.",
    conceptIds: ["c4"],
    questionIds: ["q8", "q9"],
    status: "suggested",
    source: "ai",
    confidence: 0.64,
    helperCount: 0,
    time: "10:45",
  },
];

export const rooms: Room[] = [
  {
    _id: "r1",
    title: "Base case vs recursive case",
    conceptId: "c2",
    clusterId: "k1",
    capacity: 6,
    memberCount: 5,
    helperCount: 2,
    isMember: true,
    myRole: "learner",
    time: "10:39",
  },
  {
    _id: "r2",
    title: "Forgetting the base case",
    conceptId: "c1",
    clusterId: "k2",
    capacity: 6,
    memberCount: 2,
    helperCount: 1,
    isMember: false,
    myRole: null,
    time: "10:41",
  },
];

export const roomMembersById: Record<string, Member[]> = {
  r1: [
  { alias: "brisk-heron", role: "helper", isMe: false, isSimulated: true },
  { alias: "calm-walrus", role: "helper", isMe: false, isSimulated: true },
  { alias: "quiet-otter", role: "learner", isMe: true, isSimulated: false },
  { alias: "mellow-fox", role: "learner", isMe: false, isSimulated: true },
  { alias: "sunny-lynx", role: "learner", isMe: false, isSimulated: true },
  ],
  r2: [
    { alias: "keen-puffin", role: "helper", isMe: false, isSimulated: true },
    { alias: "dusty-moth", role: "learner", isMe: false, isSimulated: true },
  ],
};

export const roomMessagesById: Record<string, Message[]> = {
  r1: [
  { _id: "m1", authorAlias: "brisk-heron", body: "hey all — where are people stuck? picking the base case, or knowing when to recurse?", isMine: false, time: "10:40" },
  {
    _id: "m2",
    authorAlias: "mellow-fox",
    body: "I never know what the base case should return. like for sum_digits(n), is it 0 or n?",
    isMine: false,
    time: "10:40",
  },
  {
    _id: "m3",
    authorAlias: "brisk-heron",
    body: "think about the smallest input you can't break down any further. for sum_digits, when n < 10 you're already done, so return n",
    isMine: false,
    time: "10:41",
  },
  {
    _id: "m4",
    authorAlias: "quiet-otter",
    body: "so the base case returns the answer for the tiny version, and the recursive case just assumes the smaller call already works?",
    isMine: true,
    time: "10:42",
  },
  {
    _id: "m5",
    authorAlias: "brisk-heron",
    body: "exactly — that's the leap of faith. you trust sum_digits(n // 10) is right and add n % 10 on top",
    isMine: false,
    time: "10:42",
  },
  { _id: "m6", authorAlias: "sunny-lynx", body: "ohh ok that reframing helps. can there be two base cases though? like fib has 0 and 1", isMine: false, time: "10:44" },
  ],
  r2: [
    { _id: "n1", authorAlias: "keen-puffin", body: "hi! so without a base case the function never stops calling itself — Python gives up after ~1000 frames with RecursionError", isMine: false, time: "10:43" },
    { _id: "n2", authorAlias: "dusty-moth", body: "ok so the error isn't a bug in recursion, it's just the missing stop condition?", isMine: false, time: "10:44" },
  ],
};

/** Pre vs post tallies for the comparison view (post phase has just started for two concepts). */
export const prePost = concepts.map((c) => ({
  conceptId: c._id,
  label: c.label,
  pre: { counts: c.counts, total: c.total },
  post:
    c._id === "c1"
      ? tally(1, 3, 8)
      : c._id === "c2"
        ? tally(2, 4, 5)
        : tally(0, 0, 0),
}));

/** Concepts with the tally for one phase swapped in (post phase has only two concepts with responses so far). */
export const conceptsForPhase = (phase: Phase): Concept[] =>
  concepts.map((c) => {
    const row = prePost.find((r) => r.conceptId === c._id)!;
    return { ...c, ...row[phase] };
  });

/** Reverse-chronological live feed for the instructor's right column. */
export type FeedItem =
  | { kind: "question"; time: string; question: Question }
  | { kind: "suggestion"; time: string; cluster: Cluster }
  | { kind: "published"; time: string; cluster: Cluster }
  | { kind: "room"; time: string; room: Room; event: "opened" | "nearly_full" }
  | { kind: "topic"; time: string; conceptId: string };

export const feed: FeedItem[] = [
  { kind: "question", time: "10:46", question: questionById("q9") },
  { kind: "question", time: "10:45", question: questionById("q8") },
  { kind: "suggestion", time: "10:45", cluster: clusters[2] },
  { kind: "suggestion", time: "10:45", cluster: clusters[3] },
  { kind: "room", time: "10:44", room: rooms[0], event: "nearly_full" },
  { kind: "question", time: "10:44", question: questionById("q4") },
  { kind: "question", time: "10:43", question: questionById("q3") },
  { kind: "question", time: "10:43", question: questionById("q2") },
  { kind: "question", time: "10:42", question: questionById("q1") },
  { kind: "room", time: "10:41", room: rooms[1], event: "opened" },
  { kind: "topic", time: "10:40", conceptId: "c3" },
  { kind: "room", time: "10:39", room: rooms[0], event: "opened" },
  { kind: "published", time: "10:37", cluster: clusters[1] },
  { kind: "published", time: "10:36", cluster: clusters[0] },
];
