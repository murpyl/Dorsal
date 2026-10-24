"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Inbox, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InlineError } from "@/components/InlineError";
import { EmptyRow } from "@/components/PublishedClusters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RUN_STALE_MS } from "@/lib/aiSchemas";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type Concept = { _id: Id<"concepts">; label: string };
type Cluster = {
  _id: Id<"clusters">;
  title: string;
  summary: string;
  conceptIds: Id<"concepts">[];
  conceptLabels: string[];
  status: "suggested" | "published" | "discarded";
  source: "ai" | "manual";
  confidence: number | null;
  questions: { _id: Id<"questions">; content: string; isSimulated: boolean }[];
};
type Run = { status: "running" | "ok" | "error"; model: string; latencyMs: number | null; error: string | null; createdAt: number };

const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function ClusterQueue({
  sessionId,
  instructorSecret,
  concepts,
}: {
  sessionId: Id<"sessions">;
  instructorSecret: string;
  concepts: Concept[];
}) {
  const creds = { sessionId, instructorSecret };
  const data = useQuery(api.clusters.listInstructor, creds);
  const questions = useQuery(api.questions.listInstructor, creds);
  const requestSuggestions = useMutation(api.clusters.requestSuggestions);
  const publish = useMutation(api.clusters.publish);
  const discard = useMutation(api.clusters.discard);
  const update = useMutation(api.clusters.update);
  const createManual = useMutation(api.clusters.createManual);
  const hide = useMutation(api.questions.hide);
  const rooms = useQuery(api.rooms.listInstructor, creds);
  const createForCluster = useMutation(api.rooms.createForCluster);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Id<"questions">[]>([]);
  const [grouping, setGrouping] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  if (data === undefined || questions === undefined) return <Skeleton className="h-48" />;
  if (data === null || questions === null) return <p className="text-sm text-muted-foreground">Couldn’t load questions (no instructor access).</p>;

  const pending = questions.filter((q) => q.state === "pending");
  const running = data.latestRun?.status === "running" && now - data.latestRun.createdAt < RUN_STALE_MS;
  const selectedQuestions = pending.filter((q) => selected.includes(q._id));

  const run = (fn: () => Promise<unknown>): Promise<boolean> => {
    setError(null);
    return fn().then(
      () => true,
      (err) => {
        setError(errorMessage(err));
        return false;
      },
    );
  };
  const toggle = (id: Id<"questions">) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <section className="space-y-4" aria-label="Question clusters">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Questions &amp; clusters</h2>
          <AiStatus run={data.latestRun} />
        </div>
        <Button
          onClick={() => run(() => requestSuggestions(creds))}
          disabled={running || pending.length === 0}
          title={pending.length === 0 ? "No pending questions" : undefined}
        >
          <Sparkles data-icon="inline-start" aria-hidden className={cn(running && "animate-pulse")} />
          {running ? "Claude is grouping…" : `Suggest clusters (${pending.length} pending)`}
        </Button>
      </div>
      <InlineError message={error} />

      {data.suggested.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Suggested by Claude — review before publishing</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.suggested.map((c, i) => (
              <ClusterCard
                key={c._id}
                i={i}
                cluster={c}
                concepts={concepts}
                onSave={(patch) => run(() => update({ ...creds, clusterId: c._id, ...patch }))}
                actions={
                  <>
                    <Button size="sm" onClick={() => run(() => publish({ ...creds, clusterId: c._id }))}>
                      Publish
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => run(() => discard({ ...creds, clusterId: c._id }))}>
                      Discard
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Published ({data.published.length})</h3>
        {data.published.length === 0 ? (
          <EmptyRow icon={<Inbox aria-hidden />} text="Nothing published yet. Students only see clusters listed here." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.published.map((c, i) => (
              <ClusterCard
                key={c._id}
                i={i}
                cluster={c}
                concepts={concepts}
                onSave={(patch) => run(() => update({ ...creds, clusterId: c._id, ...patch }))}
                actions={
                  <>
                    <Button
                      size="sm"
                      onClick={() => run(() => createForCluster({ ...creds, clusterId: c._id, conceptId: c.conceptIds[0] }))}
                      disabled={c.conceptIds.length === 0}
                    >
                      Open help room
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => run(() => discard({ ...creds, clusterId: c._id }))}>
                      Unpublish &amp; discard
                    </Button>
                  </>
                }
                footer={<ClusterRooms rooms={(rooms ?? []).filter((r) => r.clusterId === c._id)} />}
              />
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle render={<h3 />}>Moderation queue ({pending.length} pending)</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setGrouping(true)} disabled={selectedQuestions.length === 0}>
              Group selected ({selectedQuestions.length}) into a cluster
            </Button>
          </div>
          <CardDescription>
            Raw questions are only visible here. Tick pending questions to group them manually if AI suggestions are unavailable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {grouping && selectedQuestions.length > 0 && (
            <ManualClusterForm
              concepts={concepts}
              questions={selectedQuestions}
              onCancel={() => setGrouping(false)}
              onCreate={(fields) =>
                run(() => createManual({ ...creds, ...fields, questionIds: selectedQuestions.map((q) => q._id) })).then((ok) => {
                  if (!ok) return;
                  setSelected([]);
                  setGrouping(false);
                })
              }
            />
          )}
          {questions.length === 0 ? (
            <EmptyRow icon={<Inbox aria-hidden />} text="No questions yet." />
          ) : (
            <ul className="divide-y rounded-lg border">
              {questions.map((q) => {
                const checked = selected.includes(q._id);
                return (
                  <li key={q._id} className={cn("flex items-start gap-3 p-3 text-sm", checked && "bg-muted/60")}>
                    <Checkbox
                      aria-label="Select question for manual grouping"
                      checked={checked}
                      disabled={q.state !== "pending"}
                      onCheckedChange={() => toggle(q._id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="break-words">{q.content}</p>
                      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary">{q.conceptLabel}</Badge>
                        <span className="tabular-nums">{time(q.createdAt)}</span>
                        {q.state === "clustered" && <span className="text-emerald-300">in a cluster</span>}
                        {q.isSimulated && <Badge variant="outline">simulated</Badge>}
                      </p>
                    </div>
                    <Button size="xs" variant="ghost" onClick={() => run(() => hide({ ...creds, questionId: q._id }))}>
                      Hide
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function AiStatus({ run }: { run: Run | null }) {
  if (!run) return <p className="text-sm text-muted-foreground">No AI run yet. Suggestions only start when you press the button.</p>;
  if (run.status === "running")
    return <p className="text-sm text-foreground">Claude is grouping pending questions… (started {time(run.createdAt)})</p>;
  if (run.status === "ok")
    return (
      <p className="text-sm text-emerald-300">
        AI suggestions ready · {run.model} · {run.latencyMs ?? "?"} ms · {time(run.createdAt)}
      </p>
    );
  return (
    <p className="text-sm text-destructive">
      AI suggestions unavailable ({run.error ?? "unknown error"}). Group questions manually from the queue below.
    </p>
  );
}

function ConceptPicker({
  concepts,
  value,
  onChange,
}: {
  concepts: Concept[];
  value: Id<"concepts">[];
  onChange: (ids: Id<"concepts">[]) => void;
}) {
  return (
    <fieldset className="flex flex-wrap gap-1.5 text-sm">
      <legend className="sr-only">Concepts</legend>
      {concepts.map((c) => {
        const on = value.includes(c._id);
        return (
          <label
            key={c._id}
            className={cn(
              "pressable flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              on ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted",
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={on}
              onChange={(e) => onChange(e.target.checked ? [...value, c._id] : value.filter((id) => id !== c._id))}
            />
            {c.label}
          </label>
        );
      })}
    </fieldset>
  );
}

function ClusterRooms({ rooms }: { rooms: { _id: string; title: string; memberCount: number; capacity: number; helperCount: number }[] }) {
  if (rooms.length === 0) return <p className="text-xs text-muted-foreground">No help room open for this cluster yet.</p>;
  return (
    <ul className="w-full space-y-1 text-xs" aria-label="Help rooms for this cluster">
      {rooms.map((r) => (
        <li key={r._id} className="flex flex-wrap items-center gap-x-2 text-muted-foreground">
          <span className="font-medium text-foreground">{r.title}</span>
          <span className="tabular-nums">
            <strong className="text-foreground">{r.memberCount}</strong> / {r.capacity} members · {r.helperCount} helper
            {r.helperCount === 1 ? "" : "s"}
          </span>
          {r.memberCount >= r.capacity && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-900">
              full
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

function ClusterCard({
  i,
  cluster,
  concepts,
  onSave,
  actions,
  footer,
}: {
  i: number;
  cluster: Cluster;
  concepts: Concept[];
  onSave: (patch: { title: string; summary: string; conceptIds: Id<"concepts">[] }) => Promise<boolean>;
  actions: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(cluster.title);
  const [summary, setSummary] = useState(cluster.summary);
  const [conceptIds, setConceptIds] = useState(cluster.conceptIds);

  const startEdit = () => {
    setTitle(cluster.title);
    setSummary(cluster.summary);
    setConceptIds(cluster.conceptIds);
    setEditing(true);
  };

  return (
    <Card className="enter" style={{ "--i": i } as React.CSSProperties}>
      {editing ? (
        <CardContent className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Cluster title" className="font-medium" />
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} rows={2} aria-label="Cluster summary" />
          <ConceptPicker concepts={concepts} value={conceptIds} onChange={setConceptIds} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onSave({ title, summary, conceptIds }).then((ok) => ok && setEditing(false))} disabled={!title.trim() || conceptIds.length === 0}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      ) : (
        <CardHeader>
          <CardTitle render={<h4 />}>{cluster.title}</CardTitle>
          {cluster.summary && <CardDescription>{cluster.summary}</CardDescription>}
          <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
            <Button size="xs" variant="ghost" onClick={startEdit}>
              Edit
            </Button>
          </div>
          <p className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
            {cluster.conceptLabels.map((label, i) => (
              <Badge key={cluster.conceptIds[i]} variant="secondary">
                {label}
              </Badge>
            ))}
            <span>{cluster.source === "ai" ? "suggested by Claude" : "grouped manually"}</span>
            {cluster.confidence !== null && <span>model confidence {Math.round(cluster.confidence * 100)}% (not calibrated)</span>}
          </p>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {!editing && footer}
        <details open={cluster.status === "suggested"} className="group/details">
          <summary className="cursor-pointer list-none text-sm text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span className="mr-1 inline-block transition-transform duration-150 ease-out group-open/details:rotate-90" aria-hidden>
              ›
            </span>
            {cluster.questions.length} original question{cluster.questions.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 space-y-1.5 border-l-2 pl-3 text-sm">
            {cluster.questions.map((q) => (
              <li key={q._id} className="break-words">
                {q.content}
                {q.isSimulated && (
                  <Badge variant="outline" className="ml-2">
                    simulated
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </details>
      </CardContent>
      <CardFooter className="gap-2">{actions}</CardFooter>
    </Card>
  );
}

function ManualClusterForm({
  concepts,
  questions,
  onCreate,
  onCancel,
}: {
  concepts: Concept[];
  questions: { _id: Id<"questions">; conceptId: Id<"concepts">; content: string }[];
  onCreate: (fields: { title: string; summary: string; conceptIds: Id<"concepts">[] }) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [conceptIds, setConceptIds] = useState<Id<"concepts">[]>([...new Set(questions.map((q) => q.conceptId))]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onCreate({ title, summary, conceptIds });
      }}
      className="enter space-y-2 rounded-lg border border-foreground/20 bg-muted/60 p-4 text-sm"
    >
      <h4 className="font-medium">Manual cluster from {questions.length} selected question{questions.length === 1 ? "" : "s"}</h4>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="Title, e.g. Tracing recursive return values" aria-label="Cluster title" className="bg-background" />
      <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} rows={2} placeholder="Summary (optional)" aria-label="Cluster summary" className="bg-background" />
      <ConceptPicker concepts={concepts} value={conceptIds} onChange={setConceptIds} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!title.trim() || conceptIds.length === 0}>
          Publish cluster
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function ConceptClusters({
  sessionId,
  instructorSecret,
  conceptId,
}: {
  sessionId: Id<"sessions">;
  instructorSecret: string;
  conceptId: Id<"concepts">;
}) {
  const clusters = useQuery(api.clusters.listForConcept, { sessionId, instructorSecret, conceptId });
  return (
    <div className="space-y-2 text-sm">
      <h3 className="font-medium">Published question clusters</h3>
      {clusters === undefined ? (
        <Skeleton className="h-10" />
      ) : !clusters || clusters.length === 0 ? (
        <p className="text-muted-foreground">None published for this concept yet.</p>
      ) : (
        <ul className="space-y-3">
          {clusters.map((c) => (
            <li key={c._id} className="space-y-1">
              <p className="font-medium">{c.title}</p>
              {c.summary && <p className="text-muted-foreground">{c.summary}</p>}
              <ul className="space-y-1 border-l-2 pl-3 text-muted-foreground">
                {c.questions.map((q) => (
                  <li key={q._id} className="break-words">
                    {q.content}
                    {q.isSimulated && (
                      <Badge variant="outline" className="ml-2">
                        simulated
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
