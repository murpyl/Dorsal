"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RUN_STALE_MS } from "@/lib/aiSchemas";
import { errorMessage } from "@/lib/errors";

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

const btn = "rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50";
const primary = `${btn} bg-indigo-600 text-white hover:bg-indigo-700`;
const secondary = `${btn} border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50`;
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

  if (data === undefined || questions === undefined) return <p className="text-sm text-zinc-500">Loading questions…</p>;
  if (data === null || questions === null) return <p className="text-sm text-zinc-500">Couldn’t load questions (no instructor access).</p>;

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Questions &amp; clusters</h2>
          <AiStatus run={data.latestRun} />
        </div>
        <button
          onClick={() => run(() => requestSuggestions(creds))}
          disabled={running || pending.length === 0}
          className={primary}
          title={pending.length === 0 ? "No pending questions" : undefined}
        >
          {running ? "Claude is grouping…" : `Suggest clusters (${pending.length} pending)`}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data.suggested.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Suggested by Claude — review before publishing</h3>
          {data.suggested.map((c) => (
            <ClusterCard
              key={c._id}
              cluster={c}
              concepts={concepts}
              onSave={(patch) => run(() => update({ ...creds, clusterId: c._id, ...patch }))}
              actions={
                <>
                  <button onClick={() => run(() => publish({ ...creds, clusterId: c._id }))} className={primary}>
                    Publish
                  </button>
                  <button onClick={() => run(() => discard({ ...creds, clusterId: c._id }))} className={secondary}>
                    Discard
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-medium">Published ({data.published.length})</h3>
        {data.published.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing published yet. Students only see clusters listed here.</p>
        ) : (
          data.published.map((c) => (
            <ClusterCard
              key={c._id}
              cluster={c}
              concepts={concepts}
              onSave={(patch) => run(() => update({ ...creds, clusterId: c._id, ...patch }))}
              actions={
                <>
                  <button
                    onClick={() => run(() => createForCluster({ ...creds, clusterId: c._id, conceptId: c.conceptIds[0] }))}
                    disabled={c.conceptIds.length === 0}
                    className={primary}
                  >
                    Open help room
                  </button>
                  <button onClick={() => run(() => discard({ ...creds, clusterId: c._id }))} className={secondary}>
                    Unpublish &amp; discard
                  </button>
                </>
              }
              footer={<ClusterRooms rooms={(rooms ?? []).filter((r) => r.clusterId === c._id)} />}
            />
          ))
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">Moderation queue ({pending.length} pending)</h3>
          <button onClick={() => setGrouping(true)} disabled={selectedQuestions.length === 0} className={secondary}>
            Group selected ({selectedQuestions.length}) into a cluster
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Raw questions are only visible here. Tick pending questions to group them manually if AI suggestions are unavailable.
        </p>
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
          <p className="text-sm text-zinc-500">No questions yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {questions.map((q) => (
              <li key={q._id} className="flex items-start gap-3 p-3 text-sm">
                <input
                  type="checkbox"
                  aria-label="Select question for manual grouping"
                  checked={selected.includes(q._id)}
                  disabled={q.state !== "pending"}
                  onChange={() => toggle(q._id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p>{q.content}</p>
                  <p className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">{q.conceptLabel}</span>
                    <span>{time(q.createdAt)}</span>
                    {q.state === "clustered" && <span className="text-emerald-700">in a cluster</span>}
                    {q.isSimulated && <span className="rounded bg-zinc-100 px-1">simulated</span>}
                  </p>
                </div>
                <button onClick={() => run(() => hide({ ...creds, questionId: q._id }))} className={secondary}>
                  Hide
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function AiStatus({ run }: { run: Run | null }) {
  if (!run) return <p className="text-sm text-zinc-500">No AI run yet. Suggestions only start when you press the button.</p>;
  if (run.status === "running")
    return <p className="text-sm text-indigo-700">Claude is grouping pending questions… (started {time(run.createdAt)})</p>;
  if (run.status === "ok")
    return (
      <p className="text-sm text-emerald-700">
        AI suggestions ready · {run.model} · {run.latencyMs ?? "?"} ms · {time(run.createdAt)}
      </p>
    );
  return (
    <p className="text-sm text-red-600">
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
    <fieldset className="flex flex-wrap gap-2 text-sm">
      <legend className="sr-only">Concepts</legend>
      {concepts.map((c) => (
        <label key={c._id} className="flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-0.5">
          <input
            type="checkbox"
            checked={value.includes(c._id)}
            onChange={(e) => onChange(e.target.checked ? [...value, c._id] : value.filter((id) => id !== c._id))}
          />
          {c.label}
        </label>
      ))}
    </fieldset>
  );
}

function ClusterRooms({ rooms }: { rooms: { _id: string; title: string; memberCount: number; capacity: number; helperCount: number }[] }) {
  if (rooms.length === 0) return <p className="text-xs text-zinc-500">No help room open for this cluster yet.</p>;
  return (
    <ul className="space-y-1 text-xs" aria-label="Help rooms for this cluster">
      {rooms.map((r) => (
        <li key={r._id} className="rounded-lg bg-zinc-50 px-3 py-1.5 text-zinc-700">
          <span className="font-medium">{r.title}</span> · <strong>{r.memberCount}</strong> / {r.capacity} members · {r.helperCount} helper
          {r.helperCount === 1 ? "" : "s"}
          {r.memberCount >= r.capacity && <span className="ml-2 text-amber-700">full</span>}
        </li>
      ))}
    </ul>
  );
}

function ClusterCard({
  cluster,
  concepts,
  onSave,
  actions,
  footer,
}: {
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
    <article className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4 text-sm">
      {editing ? (
        <>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Cluster title" className="w-full rounded-md border border-zinc-300 px-2 py-1 font-medium" />
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} rows={2} aria-label="Cluster summary" className="w-full rounded-md border border-zinc-300 px-2 py-1" />
          <ConceptPicker concepts={concepts} value={conceptIds} onChange={setConceptIds} />
          <div className="flex gap-2">
            <button onClick={() => onSave({ title, summary, conceptIds }).then((ok) => ok && setEditing(false))} disabled={!title.trim() || conceptIds.length === 0} className={primary}>
              Save
            </button>
            <button onClick={() => setEditing(false)} className={secondary}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-base font-medium">{cluster.title}</h4>
              {cluster.summary && <p className="text-zinc-600">{cluster.summary}</p>}
            </div>
            <button onClick={startEdit} className={secondary}>
              Edit
            </button>
          </div>
          <p className="flex flex-wrap gap-2 text-xs text-zinc-500">
            {cluster.conceptLabels.map((label, i) => (
              <span key={cluster.conceptIds[i]} className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                {label}
              </span>
            ))}
            <span>{cluster.source === "ai" ? "suggested by Claude" : "grouped manually"}</span>
            {cluster.confidence !== null && <span>model confidence {Math.round(cluster.confidence * 100)}% (not calibrated)</span>}
          </p>
          {footer}
        </>
      )}
      <details open={cluster.status === "suggested"}>
        <summary className="cursor-pointer text-zinc-600">
          {cluster.questions.length} original question{cluster.questions.length === 1 ? "" : "s"}
        </summary>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-zinc-700">
          {cluster.questions.map((q) => (
            <li key={q._id}>
              {q.content}
              {q.isSimulated && <span className="ml-2 rounded bg-zinc-100 px-1 text-xs text-zinc-500">simulated</span>}
            </li>
          ))}
        </ul>
      </details>
      <div className="flex gap-2">{actions}</div>
    </article>
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
      className="space-y-2 rounded-xl border border-indigo-300 bg-indigo-50 p-4 text-sm"
    >
      <h4 className="font-medium">Manual cluster from {questions.length} selected question{questions.length === 1 ? "" : "s"}</h4>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="Title, e.g. Tracing recursive return values" aria-label="Cluster title" className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1" />
      <textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} rows={2} placeholder="Summary (optional)" aria-label="Cluster summary" className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1" />
      <ConceptPicker concepts={concepts} value={conceptIds} onChange={setConceptIds} />
      <div className="flex gap-2">
        <button type="submit" disabled={!title.trim() || conceptIds.length === 0} className={primary}>
          Publish cluster
        </button>
        <button type="button" onClick={onCancel} className={secondary}>
          Cancel
        </button>
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
    <div className="border-t border-zinc-200 pt-3">
      <h3 className="font-medium">Published question clusters</h3>
      {clusters === undefined ? (
        <p className="text-zinc-500">Loading…</p>
      ) : !clusters || clusters.length === 0 ? (
        <p className="text-zinc-500">None published for this concept yet.</p>
      ) : (
        <ul className="mt-1 space-y-2">
          {clusters.map((c) => (
            <li key={c._id}>
              <p className="font-medium">{c.title}</p>
              {c.summary && <p className="text-zinc-600">{c.summary}</p>}
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-zinc-700">
                {c.questions.map((q) => (
                  <li key={q._id}>
                    {q.content}
                    {q.isSimulated && <span className="ml-2 rounded bg-zinc-100 px-1 text-xs text-zinc-500">simulated</span>}
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
