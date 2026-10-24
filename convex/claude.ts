"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { SAVE_CLUSTERS_TOOL, sanitizeClusterSuggestions, type ClusterInput } from "../lib/aiSchemas";

const SYSTEM_PROMPT = `You group anonymous student questions from a live lecture into shared misconceptions so the instructor can address them together.
Rules:
- Use only the concept IDs and question IDs given in the message. Never invent IDs.
- A cluster needs at least two questions that share one underlying confusion, phrased differently. Put each question in at most one cluster. Leave out questions that stand alone.
- conceptIds: the concepts the misconception actually touches (usually the questions' own concepts; add a prerequisite only if the confusion is clearly about it).
- title: short, names the misconception (not "Questions about X"). summary: one or two plain sentences describing what students seem to misunderstand.
- confidence: your estimate (0–1) that these questions really share one misconception.
Call save_clusters exactly once with every cluster you found (an empty list is fine).`;

function formatInput({ concepts, questions }: ClusterInput) {
  const conceptLines = concepts.map((c) => `- ${c.id} | ${c.label}: ${c.description}`);
  const questionLines = questions.map((q) => `- ${q.id} | concept ${q.conceptId} | ${JSON.stringify(q.content)}`);
  return `Concepts:\n${conceptLines.join("\n")}\n\nQuestions:\n${questionLines.join("\n")}`;
}

export const clusterQuestions = internalAction({
  args: { sessionId: v.id("sessions"), runId: v.id("aiRuns") },
  handler: async (ctx, { sessionId, runId }) => {
    const started = Date.now();
    try {
      const model = process.env.CLAUDE_MODEL;
      if (!model) throw new Error("CLAUDE_MODEL is not set on the Convex deployment");
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the Convex deployment");

      const input = await ctx.runQuery(internal.clusters.getClusterInput, { sessionId });
      if (input.questions.length === 0) throw new Error("No pending questions to cluster");

      const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 30_000 });
      const response = await client.messages.create({
        model,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: formatInput(input) }],
        tools: [SAVE_CLUSTERS_TOOL],
        tool_choice: { type: "tool", name: "save_clusters" },
      });
      const toolUse = response.content.find((block) => block.type === "tool_use");
      if (!toolUse) throw new Error("Model did not call save_clusters");

      const { clusters, droppedIds } = sanitizeClusterSuggestions(toolUse.input, input);
      if (droppedIds > 0) console.warn(`clusterQuestions run ${runId}: dropped ${droppedIds} invalid or duplicate IDs`);
      await ctx.runMutation(internal.clusters.saveSuggestions, {
        sessionId,
        runId,
        latencyMs: Date.now() - started,
        clusters: clusters.map((c) => ({
          ...c,
          conceptIds: c.conceptIds as Id<"concepts">[],
          questionIds: c.questionIds as Id<"questions">[],
        })),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`clusterQuestions run ${runId} failed: ${message}`);
      await ctx.runMutation(internal.clusters.markRunError, { runId, error: message.slice(0, 200) });
    }
  },
});
