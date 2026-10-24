import type { Level, Phase } from "@/lib/levels";

/**
 * Fixture data for the "Control Room" layout mockup: one CS 61A recursion lecture,
 * mid-way through, a few minutes after the instructor published the first clusters.
 * Everything here is static; the mock pages copy it into local state so controls are clickable.
 */

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
};

export type Edge = { _id: string; fromId: string; toId: string };

export type Question = {
  _id: string;
  conceptId: string;
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
};

export type Room = {
  _id: string;
  title: string;
  conceptId: string;
  clusterId: string | null;
  capacity: number;
  members: { alias: string; role: "helper" | "learner"; isMe?: boolean; isSimulated?: boolean }[];
};

export type Message = { _id: string; roomId: string; authorAlias: string; body: string; isMine: boolean; time: string };

const tally = (confused: number, partial: number, can_explain: number): Counts => ({ confused, partial, can_explain });
const sum = (c: Counts) => c.confused + c.partial + c.can_explain;

const concept = (
  _id: string,
  label: string,
  description: string,
  x: number,
  y: number,
  counts: Counts,
  post: Counts,
  openClusters = 0,
): Concept => ({ _id, label, description, x, y, counts, post, total: sum(counts), openClusters });

export const SESSION = {
  _id: "session_61a_rec",
  title: "CS 61A · Recursion: how return values propagate",
  code: "KQ7MAP",
  phase: "pre" as Phase,
  state: "open" as const,
  participantCount: 38,
  simulatedCount: 30,
  alias: "quiet-otter",
  activeConceptId: "c_call_stack",
};

export const CONCEPTS: Concept[] = [
  concept(
    "c_base_case",
    "Base case",
    "The input that stops the recursion and returns a value directly.",
    0,
    40,
    tally(3, 9, 24),
    tally(1, 6, 29),
  ),
  concept(
    "c_recursive_case",
    "Recursive case",
    "Breaking the problem into a smaller instance and calling the function again.",
    260,
    40,
    tally(6, 15, 14),
    tally(3, 12, 20),
  ),
  concept(
    "c_call_stack",
    "Call stack",
    "Each call waits in its own frame until the call it made returns a value.",
    520,
    40,
    tally(17, 10, 5),
    tally(9, 13, 10),
    2,
  ),
  concept(
    "c_tree_recursion",
    "Tree recursion",
    "A call that makes two or more recursive calls, e.g. fib(n-1) + fib(n-2).",
    780,
    0,
    tally(11, 6, 2),
    tally(8, 7, 4),
    1,
  ),
  concept(
    "c_mutual_recursion",
    "Mutual recursion",
    "Two functions that call each other, like is_even and is_odd.",
    780,
    140,
    tally(2, 1, 0),
    tally(0, 0, 0),
  ),
  concept(
    "c_rec_vs_iter",
    "Recursion vs iteration",
    "Converting between a loop with state and a recursive function with arguments.",
    1040,
    70,
    tally(5, 11, 8),
    tally(4, 10, 10),
  ),
];

export const EDGES: Edge[] = [
  { _id: "e1", fromId: "c_base_case", toId: "c_recursive_case" },
  { _id: "e2", fromId: "c_recursive_case", toId: "c_call_stack" },
  { _id: "e3", fromId: "c_call_stack", toId: "c_tree_recursion" },
  { _id: "e4", fromId: "c_call_stack", toId: "c_mutual_recursion" },
  { _id: "e5", fromId: "c_tree_recursion", toId: "c_rec_vs_iter" },
  { _id: "e6", fromId: "c_mutual_recursion", toId: "c_rec_vs_iter" },
];

export const QUESTIONS: Question[] = [
  { _id: "q1", conceptId: "c_call_stack", content: "When fact(3) calls fact(2), where does the 3 go? Is it just… waiting somewhere?", state: "clustered", minutesAgo: 14, isSimulated: true },
  { _id: "q2", conceptId: "c_call_stack", content: "Why does the return value come back in the opposite order from the calls?", state: "clustered", minutesAgo: 13, isSimulated: true },
  { _id: "q3", conceptId: "c_call_stack", content: "Does each frame have its own copy of n, or do they all share one n?", state: "clustered", minutesAgo: 12, isSimulated: true },
  { _id: "q4", conceptId: "c_tree_recursion", content: "In fib(5), how many times does fib(2) actually get called? The tree in the slides lost me.", state: "clustered", minutesAgo: 9, isSimulated: true },
  { _id: "q5", conceptId: "c_tree_recursion", content: "Is tree recursion just recursion with an if/else, or is it a different thing?", state: "clustered", minutesAgo: 8, isSimulated: true },
  { _id: "q6", conceptId: "c_recursive_case", content: "How do you know what the smaller problem should be? For fact it's n-1 but for lists?", state: "clustered", minutesAgo: 6, isSimulated: true },
  { _id: "q7", conceptId: "c_recursive_case", content: "Can the recursive case call the function more than once on the same input?", state: "clustered", minutesAgo: 5, isSimulated: false },
  { _id: "q8", conceptId: "c_call_stack", content: "What happens on the stack if there is no base case? Does Python just… stop?", state: "clustered", minutesAgo: 4, isSimulated: true },
  { _id: "q9", conceptId: "c_rec_vs_iter", content: "If every recursive function can be a loop, why would you ever pick recursion?", state: "pending", minutesAgo: 2, isSimulated: false },
  { _id: "q10", conceptId: "c_base_case", content: "Can a function have two base cases? fib seems to have 0 and 1.", state: "pending", minutesAgo: 1, isSimulated: true },
];

export const CLUSTERS: Cluster[] = [
  {
    _id: "k1",
    title: "Tracing recursive return values",
    summary: "Students can write the recursive call but lose track of what each frame is waiting for and why results come back last-call-first.",
    conceptIds: ["c_call_stack"],
    questionIds: ["q1", "q2", "q3"],
    status: "published",
    source: "ai",
    confidence: 0.82,
    helperCount: 3,
  },
  {
    _id: "k2",
    title: "Counting calls in fib's tree",
    summary: "Confusion about how the call tree branches and why the same sub-call appears many times.",
    conceptIds: ["c_tree_recursion", "c_call_stack"],
    questionIds: ["q4", "q5"],
    status: "published",
    source: "ai",
    confidence: 0.71,
    helperCount: 1,
  },
  {
    _id: "k3",
    title: "Choosing the smaller problem",
    summary: "Questions about how to pick the recursive step for inputs that are not numbers (lists, strings).",
    conceptIds: ["c_recursive_case"],
    questionIds: ["q6", "q7"],
    status: "suggested",
    source: "ai",
    confidence: 0.66,
    helperCount: 2,
  },
  {
    _id: "k4",
    title: "What if there is no base case?",
    summary: "Students asking what the interpreter does when recursion never bottoms out.",
    conceptIds: ["c_call_stack", "c_base_case"],
    questionIds: ["q8"],
    status: "suggested",
    source: "ai",
    confidence: 0.58,
    helperCount: 3,
  },
];

export const ROOMS: Room[] = [
  {
    _id: "r1",
    title: "Tracing recursive return values · room 1",
    conceptId: "c_call_stack",
    clusterId: "k1",
    capacity: 6,
    members: [
      { alias: "steady-heron", role: "helper", isSimulated: true },
      { alias: "quiet-otter", role: "learner", isMe: true },
      { alias: "brisk-lynx", role: "learner", isSimulated: true },
      { alias: "mellow-finch", role: "learner", isSimulated: true },
      { alias: "sunny-badger", role: "learner", isSimulated: true },
    ],
  },
  {
    _id: "r2",
    title: "Counting calls in fib's tree · room 1",
    conceptId: "c_tree_recursion",
    clusterId: "k2",
    capacity: 6,
    members: [
      { alias: "calm-walrus", role: "helper", isSimulated: true },
      { alias: "swift-moth", role: "learner", isSimulated: true },
    ],
  },
];

export const MESSAGES: Message[] = [
  { _id: "m1", authorAlias: "steady-heron", body: "Hey all — where did the slides lose you? Let's trace fact(3) together.", isMine: false, time: "10:42" },
  { _id: "m2", authorAlias: "quiet-otter", body: "I get that fact(3) calls fact(2), but I don't see where the 3 is kept while that happens.", isMine: true, time: "10:42" },
  { _id: "m3", authorAlias: "steady-heron", body: "Think of each call as a sticky note: fact(3) writes \"3 * ???\" and waits. It can't fill in ??? until fact(2) hands back a number.", isMine: false, time: "10:43" },
  { _id: "m4", authorAlias: "brisk-lynx", body: "So there are three sticky notes on top of each other before anything returns?", isMine: false, time: "10:43" },
  { _id: "m5", authorAlias: "steady-heron", body: "Exactly: fact(3), fact(2), fact(1). fact(1) returns 1 first, so the notes get filled in from the top down. That's why results come back in reverse.", isMine: false, time: "10:44" },
  { _id: "m6", authorAlias: "mellow-finch", body: "Oh. So the 'reverse order' is just the stack popping. That finally clicked.", isMine: false, time: "10:45" },
  { _id: "m7", roomId: "r2", authorAlias: "calm-walrus", body: "Let's draw fib(5) as a tree. Each node is one call; how many children does fib(5) have?", isMine: false, time: "10:46" },
  { _id: "m8", roomId: "r2", authorAlias: "swift-moth", body: "Two: fib(4) and fib(3). And then fib(4) also calls fib(3), so fib(3) shows up twice already.", isMine: false, time: "10:47" },
  { _id: "m9", roomId: "r2", authorAlias: "calm-walrus", body: "Right, that duplication is the whole point: fib(2) ends up being computed three times in fib(5). Count the leaves and you'll see why it gets slow.", isMine: false, time: "10:47" },
].map((m) => ({ roomId: "r1", ...m }));

/** The student's own answers so far (students never see anyone else's). */
export const MY_LEVELS: Record<string, Level | null> = {
  c_base_case: "can_explain",
  c_recursive_case: "partial",
  c_call_stack: "confused",
  c_tree_recursion: null,
  c_mutual_recursion: null,
  c_rec_vs_iter: null,
};

export const MY_HELPER_CONCEPT_IDS = ["c_base_case"];

export const conceptById = (id: string) => CONCEPTS.find((c) => c._id === id)!;
export const conceptLabel = (id: string) => conceptById(id).label;
export const questionsFor = (c: Cluster) => c.questionIds.map((id) => QUESTIONS.find((q) => q._id === id)!);
