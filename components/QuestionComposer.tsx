"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InlineError } from "@/components/InlineError";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  const items = concepts.map((c) => ({ value: c._id, label: c._id === activeConceptId ? `${c.label} (current topic)` : c.label }));

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
    <form onSubmit={onSubmit} className="enter">
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle render={<h2 />}>Ask a question</CardTitle>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          about
          <Select items={items} value={conceptId ?? ""} onValueChange={(v) => v && setPicked(v as Id<"concepts">)}>
            <SelectTrigger size="sm" aria-label="Question topic" className="max-w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {items.map((it) => (
                <SelectItem key={it.value} value={it.value}>
                  {it.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
          maxLength={MAX_LENGTH}
          rows={3}
          placeholder="What's confusing you? Describe it in your own words."
          aria-label="Your question"
          className="resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {content.length}/{MAX_LENGTH}
          </span>
          <Button type="submit" disabled={!trimmed || !conceptId || sending}>
            {sending ? "Sending…" : "Send anonymously"}
            <Send data-icon="inline-end" aria-hidden />
          </Button>
        </div>
        {status?.kind === "ok" && (
          <p className="enter flex items-start gap-1.5 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            {status.text}
          </p>
        )}
        {status?.kind === "error" && <InlineError message={status.text} />}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Asking is optional. Classmates never see who asked; your instructor sees the question under your alias, not your name,
          and operators of this service could still link it to your device (pseudonymous, not fully anonymous). Question text is
          sent to an external AI (Claude, by Anthropic) to group similar questions — don&apos;t include names or personal details.
        </p>
      </CardContent>
    </Card>
    </form>
  );
}
