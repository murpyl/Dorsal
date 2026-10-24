"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InlineError } from "@/components/InlineError";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/errors";
import { MAX_RESPONSE_LENGTH } from "@/lib/prompt";

/** Student answer box for the current open-ended prompt; remount per prompt (key on the prompt id). */
export function OpenResponse({
  sessionId,
  token,
  myText,
  disabled,
}: {
  sessionId: Id<"sessions">;
  token: string;
  myText: string | null;
  disabled?: boolean;
}) {
  const respond = useMutation(api.prompts.respond);
  const [draft, setDraft] = useState(myText ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = draft.trim();
  const saved = myText !== null && trimmed === myText;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      await respond({ sessionId, token, text: trimmed });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block space-y-2 text-sm">
        <span className="sr-only">Your answer</span>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_RESPONSE_LENGTH}
          disabled={disabled}
          placeholder="Type your answer"
          className="min-h-24 bg-background"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Only your instructor and TAs see answers, without your name.</p>
        <Button type="submit" disabled={disabled || sending || !trimmed || saved}>
          {saved ? <CheckCircle2 data-icon="inline-start" aria-hidden /> : <Send data-icon="inline-start" aria-hidden />}
          {saved ? "Answer sent" : myText !== null ? "Update answer" : "Send answer"}
        </Button>
      </div>
      <InlineError message={error} />
    </form>
  );
}
