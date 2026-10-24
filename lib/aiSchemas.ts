import { z } from "zod";

const TITLE_MAX = 120;
/** A `running` aiRuns row older than this is treated as dead (server allows a retry, UI re-enables the button). */
export const RUN_STALE_MS = 60_000;
/** A misconception cluster needs at least two distinct student questions. */
export const MIN_CLUSTER_QUESTIONS = 2;
const SUMMARY_MAX = 500;

/** The single tool Claude is forced to call. `input_schema` is the structured-output contract. */
export const SAVE_CLUSTERS_TOOL = {
  name: "save_clusters",
  description:
    "Save groups of student questions that share the same underlying misconception. Use only concept and question IDs from the input; put each question in at most one cluster; leave out questions that do not share a misconception with any other.",
  input_schema: {
    type: "object" as const,
    properties: {
      clusters: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: `Short name for the misconception (max ${TITLE_MAX} chars)` },
            summary: { type: "string", description: `One or two sentences on what the students are confused about (max ${SUMMARY_MAX} chars)` },
            conceptIds: { type: "array", items: { type: "string" }, description: "IDs of the concepts this misconception touches" },
            questionIds: { type: "array", items: { type: "string" }, description: "IDs of the questions in this group" },
            confidence: { type: "number", minimum: 0, maximum: 1, description: "How sure you are these questions share one misconception" },
          },
          required: ["title", "summary", "conceptIds", "questionIds", "confidence"],
        },
      },
    },
    required: ["clusters"],
  },
};

const clusterSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  conceptIds: z.array(z.string()),
  questionIds: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});
export const clusterSuggestionsSchema = z.object({ clusters: z.array(clusterSchema) });
export type ClusterSuggestion = z.infer<typeof clusterSchema>;

export type ClusterInput = {
  concepts: { id: string; label: string; description: string }[];
  questions: { id: string; content: string; conceptId: string }[];
};

/**
 * Validates a `save_clusters` tool input against the exact batch that was sent to the model.
 * Drops IDs that were not in the input, dedupes question IDs across clusters (first cluster wins),
 * drops clusters left without questions, and falls back to the questions' own concepts when none of
 * a cluster's concept IDs are valid. Throws if the shape itself is wrong.
 */
export function sanitizeClusterSuggestions(raw: unknown, input: ClusterInput) {
  const parsed = clusterSuggestionsSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Model output did not match the save_clusters schema");

  const validConcepts = new Set(input.concepts.map((c) => c.id));
  const questionConcept = new Map(input.questions.map((q) => [q.id, q.conceptId]));
  const usedQuestions = new Set<string>();
  let droppedIds = 0;
  const clusters: ClusterSuggestion[] = [];

  for (const cluster of parsed.data.clusters) {
    const questionIds: string[] = [];
    for (const id of new Set(cluster.questionIds)) {
      if (!questionConcept.has(id) || usedQuestions.has(id)) {
        droppedIds++;
        continue;
      }
      questionIds.push(id);
    }
    droppedIds += cluster.questionIds.length - new Set(cluster.questionIds).size;
    if (questionIds.length < MIN_CLUSTER_QUESTIONS) {
      droppedIds += questionIds.length;
      continue;
    }
    for (const id of questionIds) usedQuestions.add(id);

    let conceptIds = [...new Set(cluster.conceptIds)].filter((id) => validConcepts.has(id));
    droppedIds += cluster.conceptIds.length - conceptIds.length;
    if (conceptIds.length === 0) conceptIds = [...new Set(questionIds.map((id) => questionConcept.get(id)!))];

    clusters.push({
      title: cluster.title.slice(0, TITLE_MAX),
      summary: cluster.summary.slice(0, SUMMARY_MAX),
      conceptIds,
      questionIds,
      confidence: cluster.confidence,
    });
  }
  return { clusters, droppedIds };
}
