"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { MessageSquareText } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { LOW_SAMPLE } from "@/components/ConceptGraph";
import { DistributionBar } from "@/components/PrePostComparison";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEVELS } from "@/lib/levels";
import { errorMessage } from "@/lib/errors";

const KIND_LABEL = { rating: "Rating", open: "Open-ended" } as const;

/** Staff: every prompt pushed this session (newest first) and the selected prompt's own responses. */
export function PromptHistory({
  sessionId,
  instructorSecret,
  selectedId,
  onSelect,
}: {
  sessionId: Id<"sessions">;
  instructorSecret: string;
  selectedId: Id<"prompts"> | null;
  onSelect: (id: Id<"prompts">) => void;
}) {
  const prompts = useQuery(api.prompts.list, { sessionId, instructorSecret });
  const makeCurrent = useMutation(api.prompts.makeCurrent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!prompts) return null;
  if (prompts.length === 0) return <p className="p-4 text-sm text-muted-foreground">No prompts pushed yet.</p>;
  const selected = prompts.find((p) => p._id === selectedId) ?? prompts.find((p) => p.current) ?? prompts[0];
  const items = prompts.map((p) => ({
    value: p._id,
    label: `#${p.number} · ${p.conceptLabel}${p.question ? ` — ${p.question}` : ""}${p.current ? " (current)" : ""}`,
  }));

  return (
    <Card aria-labelledby="prompts-heading" className="ring-0">
      <CardHeader className="space-y-3">
        <CardTitle id="prompts-heading" render={<h2 />}>
          Prompts
        </CardTitle>
        <Select items={items} value={selected._id} onValueChange={(v) => v && onSelect(v as Id<"prompts">)}>
          <SelectTrigger aria-label="Prompt to view" className="w-full min-w-0 bg-background">
            <SelectValue className="min-w-0 truncate" />
          </SelectTrigger>
          <SelectContent>
            {items.map((it) => (
              <SelectItem key={it.value} value={it.value}>
                {it.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {selected.current && <Badge>Current</Badge>}
            <Badge variant="secondary">{KIND_LABEL[selected.kind]}</Badge>
            <span className="text-xs text-muted-foreground">
              #{selected.number} · {new Date(selected.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
          <p className="font-medium">{selected.conceptLabel}</p>
          {selected.question && <p className="rounded-lg bg-muted px-4 py-3 text-sm">{selected.question}</p>}
          {!selected.current && (
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await makeCurrent({ sessionId, instructorSecret, promptId: selected._id });
                } catch (err) {
                  setError(errorMessage(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Make current
            </Button>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <PromptResponses sessionId={sessionId} instructorSecret={instructorSecret} promptId={selected._id} />
      </CardContent>
    </Card>
  );
}

function PromptResponses({ sessionId, instructorSecret, promptId }: { sessionId: Id<"sessions">; instructorSecret: string; promptId: Id<"prompts"> }) {
  const data = useQuery(api.prompts.responses, { sessionId, instructorSecret, promptId });
  if (!data) return null;
  const simulated = data.simulatedCount > 0 ? ` · incl. ${data.simulatedCount} simulated` : "";

  if (data.kind === "rating")
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Self-reported understanding · N = {data.total}
          {simulated}
        </p>
        <DistributionBar tally={data} />
        <ul className="space-y-1.5 text-sm">
          {LEVELS.map((l) => (
            <li key={l.value} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className={`inline-block size-2 rounded-full ${l.dot}`} aria-hidden />
                {l.label}
              </span>
              <span className="tabular-nums">
                <strong>{data.counts[l.value]}</strong>
                <span className="text-muted-foreground"> / {data.total}</span>
              </span>
            </li>
          ))}
        </ul>
        {data.total < LOW_SAMPLE && (
          <p className="text-sm text-amber-700">
            {data.total === 0 ? "No responses yet." : `Low sample (N = ${data.total}); treat the split as tentative.`}
          </p>
        )}
      </div>
    );

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <MessageSquareText className="size-3.5" aria-hidden />
        {data.total} {data.total === 1 ? "answer" : "answers"} · names hidden{simulated}
      </p>
      {data.answers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No answers yet.</p>
      ) : (
        <ul className="space-y-2">
          {data.answers.map((a) => (
            <li key={a._id} className="rounded-lg border bg-background px-4 py-3 text-sm break-words whitespace-pre-wrap">
              {a.isSimulated && (
                <Badge variant="secondary" className="mr-2">
                  Simulated
                </Badge>
              )}
              {a.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
