"use client";

import { useState } from "react";
import { ArrowRight, Check, ChevronsDownUp, ChevronsUpDown, Copy, DoorOpen, Eye, EyeOff, Inbox, Sparkles } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ConceptGraph, LOW_SAMPLE, scoreColors, understandingScore } from "@/components/ConceptGraph";
import { DistributionBar, Legend } from "@/components/PrePostComparison";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LEVELS, PHASE_LABEL, type Phase } from "@/lib/levels";
import { cn } from "@/lib/utils";
import {
  activeConceptId as initialActive,
  aiRun,
  clusters as initialClusters,
  conceptLabel,
  concepts,
  edges,
  questionById,
  questions as initialQuestions,
  rooms as initialRooms,
  session,
  type Cluster,
  type Room,
} from "../fixtures";
import { ConceptChips, roomCount, roomFull, roomHelpers } from "../parts";

const SUGGESTION_COPY: Record<string, { title: string; summary: string }> = {
  base: {
    title: "What the base case returns",
    summary: "Questions treat the base case as a stop signal and miss that its return value seeds every multiplication above it.",
  },
  stack: {
    title: "Frames after the base case",
    summary: "What happens to waiting frames once the base case returns, and why the stack grows with input size.",
  },
  recursive: {
    title: "Recursive case vs a loop",
    summary: "How calling the function again differs from repeating a loop body.",
  },
};

export default function InstructorTimelinePage() {
  const [activeId, setActiveId] = useState(initialActive);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(session.phase);
  const [presenting, setPresenting] = useState(false);
  const [graphOpen, setGraphOpen] = useState(true);
  const [questions, setQuestions] = useState(initialQuestions);
  const [clusters, setClusters] = useState(initialClusters);
  const [rooms, setRooms] = useState(initialRooms);
  const [picked, setPicked] = useState<string[]>([]);
  const [grouping, setGrouping] = useState(false);
  const [running, setRunning] = useState(false);
  const [newPending, setNewPending] = useState(2);
  const [roomTopic, setRoomTopic] = useState(concepts[0]._id);
  const [lastRun, setLastRun] = useState<{
    grouped: number;
    left: number;
  } | null>(null);

  const pending = questions.filter((q) => q.state === "pending");
  const suggested = clusters.filter((c) => c.status === "suggested");
  const published = clusters.filter((c) => c.status === "published");
  const responses = concepts.reduce((s, c) => s + c.total, 0);
  const confused = concepts.reduce((s, c) => s + c.counts.confused, 0);
  const graphConcepts = concepts.map((c) => ({
    ...c,
    openClusters: published.filter((p) => p.conceptIds.includes(c._id)).length,
  }));

  const hide = (id: string) => {
    setQuestions((qs) => qs.map((q) => (q._id === id ? { ...q, state: "hidden" as const } : q)));
    setPicked((p) => p.filter((x) => x !== id));
  };
  const markClustered = (ids: string[]) => setQuestions((qs) => qs.map((q) => (ids.includes(q._id) ? { ...q, state: "clustered" as const } : q)));

  function suggest() {
    setRunning(true);
    setNewPending(0);
    window.setTimeout(() => {
      const byConcept = new Map<string, string[]>();
      for (const q of pending) byConcept.set(q.conceptId, [...(byConcept.get(q.conceptId) ?? []), q._id]);
      const groups = [...byConcept.entries()].filter(([, ids]) => ids.length >= 2);
      const grouped = groups.flatMap(([, ids]) => ids);
      markClustered(grouped);
      setClusters((cs) => [
        ...cs,
        ...groups.map(([conceptId, ids], k) => ({
          _id: `c${Date.now()}-${k}`,
          title: SUGGESTION_COPY[conceptId]?.title ?? `Questions about ${conceptLabel(conceptId)}`,
          summary: SUGGESTION_COPY[conceptId]?.summary ?? `${ids.length} questions circle the same misunderstanding about ${conceptLabel(conceptId)}.`,
          conceptIds: [conceptId],
          questionIds: ids,
          status: "suggested" as const,
          source: "ai" as const,
          confidence: 0.66 + 0.05 * k,
          helperCount: 0,
        })),
      ]);
      setLastRun({
        grouped: grouped.length,
        left: pending.length - grouped.length,
      });
      setRunning(false);
    }, 1400);
  }
  function groupManually(fields: { title: string; summary: string; conceptIds: string[] }) {
    markClustered(picked);
    setClusters((cs) => [
      ...cs,
      {
        _id: `m${Date.now()}`,
        ...fields,
        questionIds: picked,
        status: "suggested",
        source: "manual",
        confidence: null,
        helperCount: 0,
      },
    ]);
    setPicked([]);
    setGrouping(false);
  }
  const publish = (id: string) =>
    setClusters((cs) =>
      cs.map((c) =>
        c._id === id
          ? {
              ...c,
              status: "published",
              publishedAt: session.now,
              helperCount: c.helperCount || 1,
            }
          : c,
      ),
    );
  const discard = (id: string) => {
    const c = clusters.find((x) => x._id === id);
    setClusters((cs) => cs.filter((x) => x._id !== id));
    if (c) setQuestions((qs) => qs.map((q) => (c.questionIds.includes(q._id) ? { ...q, state: "pending" } : q)));
    setRooms((rs) => rs.map((r) => (r.clusterId === id ? { ...r, clusterId: null } : r)));
  };
  const patch = (id: string, fields: Partial<Cluster>) => setClusters((cs) => cs.map((c) => (c._id === id ? { ...c, ...fields } : c)));
  const openRoom = (conceptId: string, clusterId: string | null) =>
    setRooms((rs) => [
      ...rs,
      {
        _id: `r${Date.now()}`,
        title: `${conceptLabel(conceptId)} · room ${rs.filter((r) => r.conceptId === conceptId).length + 1}`,
        conceptId,
        clusterId,
        capacity: 6,
        members: [],
        openedAt: session.now,
      },
    ]);
  const closeRoom = (id: string) => setRooms((rs) => rs.filter((r) => r._id !== id));

  const topicItems = concepts.map((c) => ({ value: c._id, label: c.label }));

  return (
    <main className="w-full space-y-5 px-6 py-5 pb-12 xl:px-8">
      {/* Top bar: who/where, the join code, the two session-level switches, and the metrics as a single line. */}
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-center gap-5">
          <Brand />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">{session.title}</h1>
            <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
              <span>
                <strong className="font-semibold text-foreground tabular-nums">{session.participantCount}</strong> joined
              </span>
              <span>
                <strong className="font-semibold text-foreground tabular-nums">{responses}</strong> responses
              </span>
              <span className={cn(confused > 0 && "text-rose-700")}>
                <strong className="font-semibold tabular-nums">{confused}</strong> confused
              </span>
              <span>
                <strong className="font-semibold text-foreground tabular-nums">{published.length}</strong> published
              </span>
              <span>
                <strong className="font-semibold text-foreground tabular-nums">{rooms.length}</strong> rooms open
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup
            aria-label="Signal phase"
            variant="outline"
            spacing={0}
            value={[phase]}
            onValueChange={(v) => {
              const next = v[0] as Phase | undefined;
              if (next) setPhase(next);
            }}
          >
            {(["pre", "post"] as const).map((p) => (
              <ToggleGroupItem key={p} value={p} className="bg-card data-pressed:bg-primary data-pressed:text-primary-foreground">
                {PHASE_LABEL[p]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button variant={presenting ? "default" : "outline"} aria-pressed={presenting} onClick={() => setPresenting((p) => !p)}>
            {presenting ? <EyeOff data-icon="inline-start" aria-hidden /> : <Eye data-icon="inline-start" aria-hidden />}
            {presenting ? "Projector mode on" : "Projector mode"}
          </Button>
          <CloseSession />
          <JoinCode code={session.code} large={presenting} />
        </div>
      </header>

      {presenting && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          Projector mode hides raw questions and unreviewed suggestions. Students only ever see the Published and Rooms columns.
        </p>
      )}

      {/* Overview: the graph is the instrument; the concept rail is its text alternative and the place to switch topics. */}
      <section aria-label="Concept overview" className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Now teaching · <span className="text-foreground normal-case">{conceptLabel(activeId)}</span>
          </h2>
          <Button size="sm" variant="ghost" onClick={() => setGraphOpen((g) => !g)} aria-expanded={graphOpen} aria-controls="graph-panel">
            {graphOpen ? <ChevronsDownUp data-icon="inline-start" aria-hidden /> : <ChevronsUpDown data-icon="inline-start" aria-hidden />}
            {graphOpen ? "Collapse graph" : "Show graph"}
          </Button>
        </div>
        <div className={cn("grid gap-4", graphOpen && "xl:grid-cols-[1fr_24rem]")}>
          {graphOpen && (
            <div id="graph-panel" className="[&_.h-80]:h-72! [&_.h-80]:lg:h-72!">
              <ConceptGraph concepts={graphConcepts} edges={edges} activeConceptId={activeId} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          )}
          <ol
            id="per-concept"
            aria-label="Per-concept distribution (text alternative to the graph)"
            className={cn("grid gap-2", graphOpen ? "content-start" : "md:grid-cols-2 xl:grid-cols-3")}
          >
            {graphConcepts.map((c) => {
              const isNow = c._id === activeId;
              const isSel = c._id === selectedId;
              const score = understandingScore(c);
              return (
                <li
                  key={c._id}
                  className={cn(
                    "grid grid-cols-[auto_1fr_auto] items-center gap-x-3 rounded-xl border bg-card px-3 py-2 text-sm",
                    isNow && "border-primary ring-2 ring-primary/20",
                    isSel && !isNow && "border-foreground",
                  )}
                >
                  <span className="h-9 w-1 rounded-full" style={{ background: scoreColors(score).accent }} aria-hidden />
                  <button
                    type="button"
                    className="min-w-0 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    onClick={() => setSelectedId(isSel ? null : c._id)}
                    aria-pressed={isSel}
                  >
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className="font-medium">
                        {c.order}. {c.label}
                      </span>
                      {isNow && <Badge className="h-4 px-1.5 text-[10px]">now</Badge>}
                      {c.openClusters > 0 && (
                        <Badge variant="secondary" className="h-4 bg-amber-100 px-1.5 text-[10px] text-amber-900">
                          {c.openClusters} published
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground tabular-nums">
                        N = {c.total}
                        {c.total < LOW_SAMPLE && <span className="ml-1 text-amber-700">{c.total === 0 ? "none" : "low"}</span>}
                      </span>
                    </span>
                    <span className="mt-1 block">
                      <DistributionBar tally={c} className="h-2" />
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground tabular-nums">
                      {LEVELS.map((l) => (
                        <span key={l.value} className="flex items-center gap-1">
                          <span className={cn("inline-block size-1.5 rounded-full", l.dot)} aria-hidden />
                          {l.label} <strong className="text-foreground">{c.counts[l.value]}</strong>
                        </span>
                      ))}
                    </span>
                  </button>
                  {isNow ? (
                    <span className="text-xs font-medium text-primary">Current</span>
                  ) : (
                    <Button size="xs" variant="outline" onClick={() => setActiveId(c._id)}>
                      Make current
                    </Button>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Work surface: the question lifecycle, left to right. Buttons move cards; nothing is dragged. */}
      <section aria-label="Question lifecycle" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Questions, left to right</h2>
          <p className="text-xs text-muted-foreground">
            {running
              ? "Claude is grouping pending questions…"
              : lastRun
                ? `Just now · ${aiRun.model} · grouped ${lastRun.grouped} question${lastRun.grouped === 1 ? "" : "s"}, left ${lastRun.left} ungrouped (no second question on the same point yet) · suggestions only`
                : `Last AI run ${aiRun.at} · ${aiRun.model} · ${aiRun.latencyMs} ms · suggestions only, nothing is published automatically`}
          </p>
        </div>
        <div className={cn("grid gap-4", presenting ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-4")}>
          {!presenting && (
            <Column
              title="Pending"
              count={pending.length}
              hint="Raw questions. Only you see these."
              badge={newPending > 0 ? `${newPending} new` : undefined}
              action={
                <Button size="sm" className="w-full" onClick={suggest} disabled={running || pending.length === 0}>
                  <Sparkles data-icon="inline-start" aria-hidden className={cn(running && "animate-pulse")} />
                  {running ? "Grouping…" : `Suggest clusters with Claude (${pending.length})`}
                </Button>
              }
            >
              {grouping && picked.length > 0 && (
                <ManualGroupForm
                  count={picked.length}
                  defaultConceptIds={[...new Set(picked.map((id) => questionById[id].conceptId))]}
                  onCancel={() => setGrouping(false)}
                  onCreate={groupManually}
                />
              )}
              {pending.length === 0 ? (
                <Empty icon={<Inbox aria-hidden />} text="Queue is clear." />
              ) : (
                pending.map((q, i) => {
                  const on = picked.includes(q._id);
                  return (
                    <li
                      key={q._id}
                      className={cn("enter rounded-lg border bg-card p-3 text-sm", on && "border-foreground")}
                      style={{ "--i": i } as React.CSSProperties}
                    >
                      <div className="flex items-start gap-2.5">
                        <Checkbox
                          aria-label="Select for manual grouping"
                          className="mt-0.5"
                          checked={on}
                          onCheckedChange={() => setPicked((p) => (on ? p.filter((x) => x !== q._id) : [...p, q._id]))}
                        />
                        <p className="min-w-0 flex-1 break-words">{q.content}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-6.5 text-xs text-muted-foreground">
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{conceptLabel(q.conceptId)}</Badge>
                          <span className="tabular-nums">{q.createdAt}</span>
                          <span>{q.alias}</span>
                        </span>
                        <Button size="xs" variant="ghost" onClick={() => hide(q._id)}>
                          Hide
                        </Button>
                      </div>
                    </li>
                  );
                })
              )}
              {picked.length > 0 && !grouping && (
                <li className="sticky bottom-2">
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => setGrouping(true)}>
                    Group {picked.length} selected into a cluster
                    <ArrowRight data-icon="inline-end" aria-hidden />
                  </Button>
                </li>
              )}
            </Column>
          )}

          {!presenting && (
            <Column title="Suggested" count={suggested.length} hint="Review, edit, then publish or discard.">
              {suggested.length === 0 ? (
                <Empty icon={<Sparkles aria-hidden />} text="No suggestions waiting. Press Suggest clusters when the queue fills up." />
              ) : (
                suggested.map((c, i) => (
                  <ClusterCard
                    key={c._id}
                    i={i}
                    cluster={c}
                    onPatch={(f) => patch(c._id, f)}
                    actions={
                      <>
                        <Button size="sm" onClick={() => publish(c._id)}>
                          Publish
                          <ArrowRight data-icon="inline-end" aria-hidden />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => discard(c._id)}>
                          Discard
                        </Button>
                      </>
                    }
                  />
                ))
              )}
            </Column>
          )}

          <Column title="Published" count={published.length} hint="What students can see now." tone="public">
            {published.length === 0 ? (
              <Empty icon={<Inbox aria-hidden />} text="Nothing published yet." />
            ) : (
              published.map((c, i) => (
                <ClusterCard
                  key={c._id}
                  i={i}
                  cluster={c}
                  onPatch={(f) => patch(c._id, f)}
                  showQuestions={!presenting}
                  footer={
                    rooms.some((r) => r.clusterId === c._id) ? (
                      <p className="text-xs text-muted-foreground">
                        {rooms.filter((r) => r.clusterId === c._id).length} room
                        {rooms.filter((r) => r.clusterId === c._id).length === 1 ? "" : "s"} open →
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No room yet.</p>
                    )
                  }
                  actions={
                    <>
                      <Button size="sm" onClick={() => openRoom(c.conceptIds[0], c._id)} disabled={presenting}>
                        <DoorOpen data-icon="inline-start" aria-hidden />
                        Open help room
                        <ArrowRight data-icon="inline-end" aria-hidden />
                      </Button>
                      {!presenting && (
                        <Button size="sm" variant="ghost" onClick={() => discard(c._id)}>
                          Unpublish
                        </Button>
                      )}
                    </>
                  }
                />
              ))
            )}
          </Column>

          <Column
            title="Rooms"
            count={rooms.length}
            hint="Live peer-help rooms, max 6 each."
            tone="public"
            action={
              presenting ? undefined : (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    openRoom(roomTopic, null);
                  }}
                >
                  <Select items={topicItems} value={roomTopic} onValueChange={(v) => v && setRoomTopic(v)}>
                    <SelectTrigger size="sm" aria-label="Topic for a new room" className="min-w-0 flex-1 bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {topicItems.map((it) => (
                        <SelectItem key={it.value} value={it.value}>
                          {it.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" type="submit">
                    Open room
                  </Button>
                </form>
              )
            }
          >
            {rooms.length === 0 ? (
              <Empty icon={<DoorOpen aria-hidden />} text="No rooms open." />
            ) : (
              rooms.map((r, i) => <RoomCard key={r._id} i={i} room={r} onClose={() => closeRoom(r._id)} readOnly={presenting} />)
            )}
            {phase === "pre" && rooms.length > 0 && !presenting && (
              <li className="rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
                Rooms are running. Switch signals to <span className="font-medium text-foreground">{PHASE_LABEL.post}</span> (top right) so room check-ins land
                in the comparison below.
              </li>
            )}
          </Column>
        </div>
      </section>

      {!presenting && (
        <section aria-labelledby="pre-post" className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="pre-post" className="text-base font-medium">
                Before vs after peer help
              </h2>
              <p className="text-sm text-muted-foreground">
                Self-reported understanding per phase; each bar carries its own N. No after-help signals yet — they appear once you switch the phase and
                students check in from a room. A shift here is what students <em>say</em>, not measured learning.
              </p>
            </div>
            <Legend />
          </div>
          <ul className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
            {concepts.map((c) => (
              <li key={c._id} className="space-y-1 text-xs">
                <p className="text-sm font-medium">{c.label}</p>
                <div className="grid grid-cols-[2.5rem_1fr_4.5rem] items-center gap-2">
                  <span className="font-mono text-muted-foreground uppercase">pre</span>
                  <DistributionBar tally={c} />
                  <span className="text-muted-foreground tabular-nums">N = {c.total}</span>
                </div>
                <div className="grid grid-cols-[2.5rem_1fr_4.5rem] items-center gap-2">
                  <span className="font-mono text-muted-foreground uppercase">post</span>
                  <DistributionBar tally={{ counts: c.post, total: c.postTotal }} />
                  <span className="text-muted-foreground tabular-nums">
                    N = {c.postTotal} <span className="text-muted-foreground/60">none</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Column({
  title,
  count,
  hint,
  badge,
  tone,
  action,
  children,
}: {
  title: string;
  count: number;
  hint: string;
  badge?: string;
  tone?: "public";
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={`${title} (${count})`}
      className={cn("flex min-h-[18rem] flex-col rounded-2xl border bg-muted/40 p-3", tone === "public" && "border-teal-200 bg-teal-50/40")}
    >
      <header className="mb-2 space-y-2 px-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-heading text-base font-medium">
            {title}
            <Badge variant="secondary" className="bg-card tabular-nums">
              {count}
            </Badge>
            {badge && <Badge className="animate-pulse motion-reduce:animate-none">{badge}</Badge>}
          </h3>
          {tone === "public" && (
            <Badge variant="outline" className="border-teal-300 text-teal-900">
              <Eye aria-hidden /> students see this
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
        {action}
      </header>
      <ul className="flex flex-1 flex-col gap-2">{children}</ul>
    </section>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0">
      {icon}
      {text}
    </li>
  );
}

function ClusterCard({
  i,
  cluster,
  onPatch,
  actions,
  footer,
  showQuestions = true,
}: {
  i: number;
  cluster: Cluster;
  onPatch: (fields: Partial<Cluster>) => void;
  actions: React.ReactNode;
  footer?: React.ReactNode;
  showQuestions?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(cluster.title);
  const [summary, setSummary] = useState(cluster.summary);
  return (
    <li className="enter rounded-lg border bg-card p-3 text-sm" style={{ "--i": i } as React.CSSProperties}>
      {editing ? (
        <div className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Cluster title" className="font-medium" />
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} rows={3} aria-label="Cluster summary" />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!title.trim()}
              onClick={() => {
                onPatch({ title: title.trim(), summary: summary.trim() });
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-heading font-medium">{cluster.title}</h4>
            <p className="mt-0.5 text-muted-foreground">{cluster.summary}</p>
          </div>
          <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      )}
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <ConceptChips ids={cluster.conceptIds} />
        <span>{cluster.source === "ai" ? "Claude" : "grouped manually"}</span>
        {cluster.confidence !== null && <span>{Math.round(cluster.confidence * 100)}% model confidence (not calibrated)</span>}
        {cluster.status === "published" && (
          <span>
            {cluster.helperCount} helper{cluster.helperCount === 1 ? "" : "s"} opted in
          </span>
        )}
      </p>
      {showQuestions && (
        <details className="group/d mt-2" open={cluster.status === "suggested"}>
          <summary className="cursor-pointer list-none text-xs text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span className="mr-1 inline-block transition-transform duration-150 group-open/d:rotate-90" aria-hidden>
              ›
            </span>
            {cluster.questionIds.length} original question
            {cluster.questionIds.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-1.5 space-y-1 border-l-2 pl-2.5 text-xs text-muted-foreground">
            {cluster.questionIds.map((id) => (
              <li key={id}>{questionById[id]?.content}</li>
            ))}
          </ul>
        </details>
      )}
      {footer && <div className="mt-2">{footer}</div>}
      <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>
    </li>
  );
}

function RoomCard({ i, room, onClose, readOnly }: { i: number; room: Room; onClose: () => void; readOnly: boolean }) {
  const full = roomFull(room);
  return (
    <li className="enter rounded-lg border bg-card p-3 text-sm" style={{ "--i": i } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-medium">{room.title}</h4>
          <p className="text-xs text-muted-foreground">
            opened {room.openedAt} · {roomHelpers(room)} helper
            {roomHelpers(room) === 1 ? "" : "s"}
            {room.clusterId && <> · for a published group</>}
          </p>
        </div>
        <Badge variant="secondary" className={cn("tabular-nums", full && "bg-amber-100 text-amber-900")}>
          {roomCount(room)}
          {full && " · full"}
        </Badge>
      </div>
      <div className="mt-2 flex h-1.5 gap-0.5" aria-hidden>
        {Array.from({ length: room.capacity }).map((_, k) => (
          <span
            key={k}
            className={cn("flex-1 rounded-full", k < room.members.length ? (room.members[k].role === "helper" ? "bg-teal-500" : "bg-primary") : "bg-muted")}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {room.members.length === 0 ? "Waiting for the first student." : room.members.map((m) => m.alias).join(", ")}
      </p>
      {!readOnly && (
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={onClose}>
            Close room
          </Button>
        </div>
      )}
    </li>
  );
}

function ManualGroupForm({
  count,
  defaultConceptIds,
  onCreate,
  onCancel,
}: {
  count: number;
  defaultConceptIds: string[];
  onCreate: (fields: { title: string; summary: string; conceptIds: string[] }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [conceptIds, setConceptIds] = useState(defaultConceptIds);
  return (
    <li>
      <form
        className="enter space-y-2 rounded-lg border border-foreground/20 bg-card p-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate({
            title: title.trim(),
            summary: summary.trim(),
            conceptIds,
          });
        }}
      >
        <h4 className="font-medium">Manual cluster from {count} selected</h4>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
          placeholder="Title, e.g. Tracing return values"
          aria-label="Cluster title"
        />
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="One-line summary (optional)"
          aria-label="Cluster summary"
        />
        <fieldset className="flex flex-wrap gap-1.5">
          <legend className="sr-only">Concepts</legend>
          {concepts.map((c) => {
            const on = conceptIds.includes(c._id);
            return (
              <label
                key={c._id}
                className={cn(
                  "pressable flex cursor-pointer items-center rounded-full border px-2.5 py-1 text-xs font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  on ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={(e) => setConceptIds(e.target.checked ? [...conceptIds, c._id] : conceptIds.filter((id) => id !== c._id))}
                />
                {c.label}
              </label>
            );
          })}
        </fieldset>
        <div className="flex gap-2">
          <Button size="sm" type="submit" disabled={!title.trim() || conceptIds.length === 0}>
            Create suggestion
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </li>
  );
}

function JoinCode({ code, large }: { code: string; large: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-card px-4 py-2", large && "px-6 py-3")}>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Join at classpulse.app/join</p>
        <p className={cn("font-mono font-bold tracking-[0.25em]", large ? "text-5xl" : "text-3xl")}>{code}</p>
      </div>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={copied ? "Link copied" : "Copy join link"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? <Check className="text-teal-700" aria-hidden /> : <Copy aria-hidden />}
      </Button>
    </div>
  );
}

function CloseSession() {
  const [closed, setClosed] = useState(false);
  if (closed)
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-900">
        Session closed
      </Badge>
    );
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>Close session</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close this session?</AlertDialogTitle>
          <AlertDialogDescription>Students can no longer send signals or chat. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it open</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => setClosed(true)}>
            Close session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
