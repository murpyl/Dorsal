import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export const MIN_SECRET_LENGTH = 32;

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getInstructorSession(ctx: QueryCtx, sessionId: Id<"sessions">, secret: string) {
  const session = await ctx.db.get(sessionId);
  if (!session || session.instructorSecretHash !== (await sha256(secret))) return null;
  return session;
}

export async function findParticipant(ctx: QueryCtx, sessionId: Id<"sessions">, token: string) {
  const tokenHash = await sha256(token);
  const matches = await ctx.db
    .query("participants")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .collect();
  return matches.find((p) => p.sessionId === sessionId) ?? null;
}

export async function requireParticipant(ctx: QueryCtx, sessionId: Id<"sessions">, token: string) {
  const participant = await findParticipant(ctx, sessionId, token);
  if (!participant) throw new ConvexError("Not a participant in this session");
  return participant;
}
