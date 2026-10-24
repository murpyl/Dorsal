"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";

const MAX_LENGTH = 500;

export function QuestionComposer({
  sessionId,
  token,
  concepts,
  activeConceptId,
}: {
  sessionId: Id<"sessions">;
  token: string;
  concepts: { _id: Id<"concepts">; label: string }[];
  activeConceptId: Id<"concepts"> | null;
}) {
  const submit = useMutation(api.questions.submit);
  const [picked, setPicked] = useState<Id<"concepts"> | null>(null);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const conceptId = picked ?? activeConceptId ?? concepts[0]?._id ?? null;
  const trimmed = content.trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!conceptId || !trimmed) return;
    setSending(true);
    setStatus(null);
    try {
      await submit({ sessionId, token, conceptId, content: trimmed });
      setContent("");
      setStatus({ kind: "ok", text: "Sent to your instructor. It stays private until they publish a cluster that includes it." });
    } catch (err) {
      setStatus({ kind: "error", text: errorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">Ask a question</h2>
        <label className="text-sm text-zinc-600">
          about{" "}
          <select
            value={conceptId ?? ""}
            onChange={(e) => setPicked(e.target.value as Id<"concepts">)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
          >
            {concepts.map((c) => (
              <option key={c._id} value={c._id}>
                {c.label}
                {c._id === activeConceptId ? " (current topic)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
        maxLength={MAX_LENGTH}
        rows={3}
        placeholder="What's confusing you? Describe it in your own words."
        aria-label="Your question"
        className="w-full rounded-lg border border-zinc-300 p-2 text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-zinc-500">
          {content.length}/{MAX_LENGTH}
        </span>
        <button
          type="submit"
          disabled={!trimmed || !conceptId || sending}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send anonymously"}
        </button>
      </div>
      {status && <p className={`text-sm ${status.kind === "ok" ? "text-emerald-700" : "text-red-600"}`}>{status.text}</p>}
      <p className="text-xs text-zinc-500">
        Asking is optional. Classmates never see who asked; your instructor sees the question under your alias, not your name,
        and operators of this service could still link it to your device (pseudonymous, not fully anonymous). Question text is
        sent to an external AI (Claude, by Anthropic) to group similar questions — don&apos;t include names or personal details.
      </p>
    </form>
  );
}
