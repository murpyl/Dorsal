import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

const MIN_SECRET_LENGTH = 32;
const MAX_SECRET_LENGTH = 128;

export const isValidSecret = (s: string) => s.length >= MIN_SECRET_LENGTH && s.length <= MAX_SECRET_LENGTH;

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Resolves a staff secret to the session and the caller's role: the instructor secret, or one TA's personal link
 * secret (a TA is a participant row with `isTa`, so the same secret is also their identity inside help rooms).
 */
export async function getStaffSession(ctx: QueryCtx, sessionId: Id<"sessions">, secret: string) {
  if (!isValidSecret(secret)) return null;
  const session = await ctx.db.get(sessionId);
  if (!session) return null;
  if (session.instructorSecretHash === (await sha256(secret))) return { session, role: "instructor" as const, ta: null };
  const ta = await findParticipant(ctx, sessionId, secret);
  if (ta?.isTa) return { session, role: "ta" as const, ta };
  return null;
}

/** Everything on the instructor dashboard: accepts the instructor secret or the TA secret. */
export async function getInstructorSession(ctx: QueryCtx, sessionId: Id<"sessions">, secret: string) {
  return (await getStaffSession(ctx, sessionId, secret))?.session ?? null;
}

export async function findParticipant(ctx: QueryCtx, sessionId: Id<"sessions">, token: string) {
  if (!isValidSecret(token)) return null;
  const tokenHash = await sha256(token);
  const matches = await ctx.db
    .query("participants")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .collect();
  return matches.find((p) => p.sessionId === sessionId) ?? null;
}

/** A student participant; TA room identities are rejected (they never rate, ask, volunteer or join as students). */
export async function requireParticipant(ctx: QueryCtx, sessionId: Id<"sessions">, token: string) {
  const participant = await findParticipant(ctx, sessionId, token);
  if (!participant) throw new ConvexError("Not a participant in this session");
  if (participant.isTa) throw new ConvexError("TAs can't do this");
  return participant;
}
