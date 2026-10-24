import { z } from "zod";
import { canAddPrerequisite, DESCRIPTION_MAX, LABEL_MAX, MAX_CONCEPTS, type LessonConcept } from "./lessonGraph";

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

export const LESSON_MAX_FILES = 5;
export const LESSON_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const LESSON_MAX_TOTAL_BYTES = 20 * 1024 * 1024;
export const LESSON_NOTES_MAX = 20_000;
/** Upload types Claude reads directly: PDFs as documents, text as plain-text documents, images as images. */
export const LESSON_FILE_TYPES = ["application/pdf", "text/plain", "text/markdown", "image/png", "image/jpeg"] as const;
/** Global cap on concept-inference calls (they run before a session, so there is no instructor secret to check). */
export const INFER_RATE_LIMIT = { runs: 20, windowMs: 10 * 60_000 };

export const SAVE_CONCEPTS_TOOL = {
  name: "save_concepts",
  description:
    "Save the key concepts of this lesson in teaching order. Each prerequisite must be the exact label of another concept in the list.",
  input_schema: {
    type: "object" as const,
    properties: {
      concepts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: `Short noun phrase naming the concept (max ${LABEL_MAX} chars)` },
            description: { type: "string", description: `One plain sentence a student would recognise (max ${DESCRIPTION_MAX} chars)` },
            prerequisites: {
              type: "array",
              items: { type: "string" },
              description: "Labels of other concepts in this list that must be understood first (direct prerequisites only)",
            },
          },
          required: ["label", "description", "prerequisites"],
        },
      },
    },
    required: ["concepts"],
  },
};

const conceptSuggestionSchema = z.object({
  label: z.string(),
  description: z.string(),
  prerequisites: z.array(z.string()),
});
export const conceptSuggestionsSchema = z.object({ concepts: z.array(conceptSuggestionSchema) });

/**
 * Validates a `save_concepts` tool input: trims and caps labels/descriptions, drops empty and duplicate
 * (case-insensitive) labels, keeps at most MAX_CONCEPTS, and maps prerequisite labels to indices, dropping
 * unknown, self, duplicate and cycle-creating links. Throws if the shape itself is wrong.
 */
export function sanitizeConceptSuggestions(raw: unknown) {
  const parsed = conceptSuggestionsSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Model output did not match the save_concepts schema");

  const kept: { label: string; description: string; prereqLabels: string[] }[] = [];
  const indexByLabel = new Map<string, number>();
  for (const c of parsed.data.concepts) {
    const label = c.label.trim().slice(0, LABEL_MAX).trim();
    const key = label.toLowerCase();
    if (!label || indexByLabel.has(key) || kept.length >= MAX_CONCEPTS) continue;
    indexByLabel.set(key, kept.length);
    kept.push({ label, description: c.description.trim().slice(0, DESCRIPTION_MAX).trim(), prereqLabels: c.prerequisites });
  }

  const concepts: LessonConcept[] = kept.map(({ label, description }) => ({ label, description, prerequisites: [] }));
  let droppedLinks = 0;
  kept.forEach((c, i) => {
    for (const prereqLabel of c.prereqLabels) {
      const p = indexByLabel.get(prereqLabel.trim().slice(0, LABEL_MAX).trim().toLowerCase());
      if (p === undefined || !canAddPrerequisite(concepts, i, p)) droppedLinks++;
      else concepts[i].prerequisites.push(p);
    }
  });
  return { concepts, droppedLinks };
}
