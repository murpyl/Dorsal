"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useMemo, useState } from "react";
import { Check, Copy, DoorOpen, EyeOff, Inbox, MessageSquareText, Presentation, Radio, Sparkles } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ConceptGraph, LOW_SAMPLE, understandingScore } from "@/components/ConceptGraph";
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
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LEVELS, PHASE_LABEL, type Phase } from "@/lib/levels";
import { cn } from "@/lib/utils";
import {
  type Cluster,
  type FeedItem,
  clusters as initialClusters,
  concepts,
  conceptById,
  edges,
  feed as initialFeed,
  prePost,
  questionById,
  rooms as initialRooms,
  session,
} from "../fixtures";

type Filter = "all" | "questions" | "clusters" | "rooms";

export default function FocusFlowInstructor() {
  const [activeId, setActiveId] = useState(session.activeConceptId);
  const [selectedId, setSelectedId] = useState<string | null>(session.activeConceptId);
  const [phase, setPhase] = useState<Phase>(session.phase);
  const [view, setView] = useState<"graph" | "compare">("graph");
  const [presenting, setPresenting] = useState(false);
  const [clusters, setClusters] = useState(initialClusters);
  const [rooms, setRooms] = useState(initialRooms);
  const [feed, setFeed] = useState<FeedItem[]>(initialFeed);
  const [hidden, setHidden] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [grouping, setGrouping] = useState(false);
  const [running, setRunning] = useState(false);

  const graphConcepts = useMemo(
    () => concepts.map((c) => ({ ...c, openClusters: clusters.filter((k) => k.status === "published" && k.conceptIds.includes(c._id)).length })),
    [clusters],
  );
  const selected = graphConcepts.find((c) => c._id === selectedId) ?? null;
  const responses = concepts.reduce((s, c) => s + c.total, 0);
  const confused = concepts.reduce((s, c) => s + c.counts.confused, 0);
  const published = clusters.filter((k) => k.status === "published");
  const suggested = clusters.filter((k) => k.status === "suggested");
  const pendingIds = feed.flatMap((f) => (f.kind === "question" && f.question.state === "pending" && !hidden.includes(f.question._id) ? [f.question._id] : []));
  const openRooms = rooms.filter((r) => r.memberCount > 0);

  const visible = feed.filter((f) => {
    if (f.kind === "question" && hidden.includes(f.question._id)) return false;
    if (f.kind === "suggestion" && !clusters.some((k) => k._id === f.cluster._id && k.status === "suggested")) return false;
    if (filter === "all") return true;
    if (filter === "questions") return f.kind === "question";
    if (filter === "clusters") return f.kind === "suggestion" || f.kind === "published";
    return f.kind === "room";
  });

  const publish = (k: Cluster) => {
    setClusters((ks) => ks.map((x) => (x._id === k._id ? { ...x, status: "published" } : x)));
    setFeed((f) => [{ kind: "published", time: "10:47", cluster: { ...k, status: "published" } }, ...f]);
  };
  const discard = (k: Cluster) => setClusters((ks) => ks.filter((x) => x._id !== k._id));
  const openRoom = (k: Cluster) => {
    const room = {
      _id: `r${rooms.length + 1}`,
      title: k.title,
      conceptId: k.conceptIds[0],
      clusterId: k._id,
      capacity: 6,
      memberCount: 0,
      helperCount: 0,
      isMember: false,
      myRole: null,
      time: "10:47",
    } as const;
    setRooms((rs) => [...rs, room]);
    setFeed((f) => [{ kind: "room", time: "10:47", room, event: "opened" }, ...f]);
  };
  const makeCurrent = (id: string) => {
    setActiveId(id);
    setFeed((f) => [{ kind: "topic", time: "10:47", conceptId: id }, ...f]);
  };

  return (
    <main className="flex h-dvh w-full flex-col gap-3 overflow-hidden px-5 py-4">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-5">
          <Brand />
          <div>
            <p className="text-xs text-muted-foreground">
              {session.course} · Instructor · signals: {PHASE_LABEL[phase]}
            </p>
            <h1 className="text-xl font-semibold tracking-tight">{session.title}</h1>
          </div>
        </div>

        <dl className={cn("flex items-center gap-2 text-sm", presenting && "hidden")} aria-label="Session metrics">
          <Metric label="participants" value={session.participantCount} detail={`${session.simulatedCount} simulated`} />
          <Metric label="responses" value={responses} detail="this phase" />
          <Metric label="confused" value={confused} detail={`of ${responses}`} tone={confused > 0 ? "warn" : undefined} />
          <Metric label="published" value={published.length} detail="clusters" />
        </dl>

        <div className="flex items-center gap-3">
          <JoinCode large={presenting} />
          {!presenting && (
            <>
              <ToggleGroup aria-label="Signal phase" variant="outline" spacing={0} value={[phase]} onValueChange={(v) => v[0] && setPhase(v[0] as Phase)}>
                {(["pre", "post"] as const).map((p) => (
                  <ToggleGroupItem key={p} value={p} className="bg-card data-pressed:bg-primary data-pressed:text-primary-foreground">
                    {PHASE_LABEL[p]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" />}>Close session</AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close this session?</AlertDialogTitle>
                    <AlertDialogDescription>Students can no longer send signals or chat. This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it open</AlertDialogCancel>
                    <AlertDialogAction variant="destructive">Close session</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <Button
            variant={presenting ? "default" : "outline"}
            aria-pressed={presenting}
            onClick={() => setPresenting((p) => !p)}
            title="Hides raw questions and the feed while the screen is mirrored"
          >
            {presenting ? <EyeOff data-icon="inline-start" aria-hidden /> : <Presentation data-icon="inline-start" aria-hidden />}
            {presenting ? "Presenting · feed hidden" : "Present"}
          </Button>
        </div>
      </header>

      <div className={cn("grid min-h-0 flex-1 gap-4", presenting ? "grid-cols-[1fr_12rem]" : "grid-cols-[1fr_27rem]")}>
        <section className="flex min-h-0 flex-col gap-3" aria-label="Teach view">
          <div className="flex items-center justify-between gap-3">
            <Tabs.Root value={view} onValueChange={(v) => setView(v as "graph" | "compare")}>
              <Tabs.List className="flex gap-1 rounded-full bg-muted p-1" aria-label="Left panel view">
                {(
                  [
                    ["graph", "Live graph"],
                    ["compare", "Before vs after"],
                  ] as const
                ).map(([v, label]) => (
                  <Tabs.Tab
                    key={v}
                    value={v}
                    className="h-8 rounded-full px-3.5 text-sm font-semibold text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-active:bg-card data-active:text-foreground"
                  >
                    {label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.Root>
            <p className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Current topic</span>
              <Badge className="h-6 px-2.5 text-[13px]">
                <span className="relative flex size-1.5" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground/70 motion-reduce:hidden" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary-foreground" />
                </span>
                {conceptById(activeId)?.label}
              </Badge>
              {selected && selected._id !== activeId && (
                <Button size="sm" onClick={() => makeCurrent(selected._id)}>
                  Make “{selected.label}” current
                </Button>
              )}
            </p>
          </div>

          {view === "graph" ? (
            <div className="flex min-h-0 flex-1 flex-col [&>figure]:min-h-0 [&>figure]:flex-1 [&>figure>div:last-child]:h-auto [&>figure>div:last-child]:min-h-0 [&>figure>div:last-child]:flex-1">
              <ConceptGraph concepts={graphConcepts} edges={edges} activeConceptId={activeId} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">Before vs after peer help</h2>
                <p className="text-xs text-muted-foreground">Each bar shows its own N. A shift measures what students say, not verified learning.</p>
              </div>
              <ul className="grid grid-cols-2 gap-x-8 gap-y-4">
                {prePost.map((r) => (
                  <li key={r.conceptId} className="space-y-1.5">
                    <p className="text-sm font-medium">{r.label}</p>
                    {(["pre", "post"] as const).map((p) => {
                      const t = r[p];
                      return (
                        <div key={p} className="grid grid-cols-[2.5rem_1fr_6rem] items-center gap-2 text-xs">
                          <span className="font-mono uppercase text-muted-foreground">{p}</span>
                          <div role="img" aria-label={`${PHASE_LABEL[p]}: ${LEVELS.map((l) => `${l.label} ${t.counts[l.value]}`).join(", ")}, N = ${t.total}`}>
                            <DistributionBar tally={t} />
                          </div>
                          <span className="tabular-nums text-muted-foreground">
                            N = {t.total}
                            {t.total === 0 ? <span className="ml-1 opacity-60">none</span> : t.total < LOW_SAMPLE && <span className="ml-1 text-amber-600">low</span>}
                          </span>
                        </div>
                      );
                    })}
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <Legend />
              </div>
            </div>
          )}

          <section id="per-concept" aria-labelledby="per-concept-heading" className="rounded-xl bg-card ring-1 ring-foreground/10">
            <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2">
              <h2 id="per-concept-heading" className="text-sm font-semibold">
                Per-concept distribution <span className="font-normal text-muted-foreground">· text alternative to the graph</span>
              </h2>
              <Legend />
            </div>
            <ul className="divide-y">
              {graphConcepts.map((c) => {
                const isActive = c._id === activeId;
                const isSelected = c._id === selectedId;
                const score = understandingScore(c);
                return (
                  <li
                    key={c._id}
                    className={cn("grid grid-cols-[13rem_1fr_17rem_auto] items-center gap-4 px-4 py-1.5 text-sm", isSelected && "bg-accent/60")}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(c._id)}
                      aria-pressed={isSelected}
                      className="flex min-w-0 items-center gap-2 rounded-md text-left font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span className="truncate">{c.label}</span>
                      {isActive && <Badge className="shrink-0">now</Badge>}
                      {c.openClusters > 0 && (
                        <Badge variant="secondary" className="shrink-0 bg-amber-100 text-amber-900">
                          {c.openClusters}
                        </Badge>
                      )}
                    </button>
                    <div
                      role="img"
                      aria-label={`${c.label}: ${LEVELS.map((l) => `${l.label} ${c.counts[l.value]}`).join(", ")}, N = ${c.total}${score !== null ? `, understanding ${Math.round(score * 100)}%` : ""}`}
                    >
                      <DistributionBar tally={c} className="h-3" />
                    </div>
                    <p className="flex gap-3 text-xs tabular-nums text-muted-foreground">
                      {LEVELS.map((l) => (
                        <span key={l.value} className="flex items-center gap-1">
                          <span className={`inline-block size-1.5 rounded-full ${l.dot}`} aria-hidden />
                          <strong className="text-foreground">{c.counts[l.value]}</strong>
                        </span>
                      ))}
                      <span>
                        N = {c.total}
                        {c.total < LOW_SAMPLE && <span className="ml-1 text-amber-600">low</span>}
                      </span>
                    </p>
                    <div className="flex justify-end gap-1">
                      <Button size="xs" variant={isActive ? "ghost" : "outline"} disabled={isActive} onClick={() => makeCurrent(c._id)}>
                        {isActive ? "Current" : "Make current"}
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          const room = {
                            _id: `r${rooms.length + 1}`,
                            title: c.label,
                            conceptId: c._id,
                            clusterId: null,
                            capacity: 6,
                            memberCount: 0,
                            helperCount: 0,
                            isMember: false,
                            myRole: null,
                            time: "10:47",
                          } as const;
                          setRooms((rs) => [...rs, room]);
                          setFeed((f) => [{ kind: "room", time: "10:47", room, event: "opened" }, ...f]);
                        }}
                      >
                        <DoorOpen data-icon="inline-start" aria-hidden />
                        Room
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </section>

        {presenting ? (
          <aside className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10" aria-label="Live counts">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Radio className="size-4 text-primary" aria-hidden /> Live
            </p>
            <Count n={pendingIds.length} label="questions waiting" />
            <Count n={suggested.length} label="cluster suggestions" />
            <Count n={openRooms.length} label="rooms open" />
            <p className="mt-auto text-xs text-muted-foreground">Raw questions are hidden while presenting. Stop presenting to review them.</p>
          </aside>
        ) : (
          <aside className="flex min-h-0 flex-col rounded-xl bg-card ring-1 ring-foreground/10" aria-label="Live feed">
            <div className="space-y-2.5 border-b px-4 pt-3 pb-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <Radio className="size-4 text-primary" aria-hidden /> Live feed
                </h2>
                <p className="text-xs text-muted-foreground">
                  {running ? "Claude is grouping…" : "Last AI run 10:45 · claude-sonnet-4-5 · 2.1 s"}
                </p>
              </div>
              <Button
                className="w-full"
                disabled={running || pendingIds.length === 0}
                onClick={() => {
                  setRunning(true);
                  setTimeout(() => setRunning(false), 1800);
                }}
              >
                <Sparkles data-icon="inline-start" aria-hidden className={cn(running && "animate-pulse")} />
                {running ? "Claude is grouping…" : `Suggest clusters (${pendingIds.length} pending)`}
              </Button>
              <Tabs.Root value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <Tabs.List className="grid grid-cols-4 gap-1 rounded-full bg-muted p-1" aria-label="Filter feed">
                  {(
                    [
                      ["all", "All", visible.length],
                      ["questions", "Questions", pendingIds.length],
                      ["clusters", "Clusters", suggested.length],
                      ["rooms", "Rooms", openRooms.length],
                    ] as const
                  ).map(([v, label, n]) => (
                    <Tabs.Tab
                      key={v}
                      value={v}
                      className="flex h-7 items-center justify-center gap-1 rounded-full text-xs font-semibold text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-active:bg-card data-active:text-foreground"
                    >
                      {label}
                      {v !== "all" && <span className="tabular-nums opacity-70">{n}</span>}
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.Root>
            </div>

            <ol className="min-h-0 flex-1 divide-y overflow-y-auto" aria-live="polite">
              {visible.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nothing here yet.</li>}
              {visible.map((f, i) => (
                <li key={`${f.kind}-${i}-${f.time}`} className="enter px-4 py-3 text-sm" style={{ "--i": Math.min(i, 6) } as React.CSSProperties}>
                  {f.kind === "question" && (
                    <div className={cn("flex items-start gap-3", picked.includes(f.question._id) && "-mx-2 rounded-lg bg-muted/70 px-2 py-1")}>
                      <Checkbox
                        aria-label="Select question for manual grouping"
                        checked={picked.includes(f.question._id)}
                        disabled={f.question.state !== "pending"}
                        onCheckedChange={() =>
                          setPicked((p) => (p.includes(f.question._id) ? p.filter((x) => x !== f.question._id) : [...p, f.question._id]))
                        }
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <MessageSquareText className="size-3.5" aria-hidden />
                          <span className="tabular-nums">{f.time}</span>
                          <Badge variant="secondary">{conceptById(f.question.conceptId)?.label}</Badge>
                          <span>{f.question.alias}</span>
                          {f.question.isSimulated && <Badge variant="outline">simulated</Badge>}
                        </p>
                        <p className="break-words">{f.question.content}</p>
                      </div>
                      <Button size="xs" variant="ghost" onClick={() => setHidden((h) => [...h, f.question._id])}>
                        Hide
                      </Button>
                    </div>
                  )}
                  {f.kind === "suggestion" && (
                    <SuggestionCard
                      cluster={clusters.find((k) => k._id === f.cluster._id) ?? f.cluster}
                      time={f.time}
                      onPublish={publish}
                      onDiscard={discard}
                      onSave={(k) => setClusters((ks) => ks.map((x) => (x._id === k._id ? k : x)))}
                    />
                  )}
                  {f.kind === "published" && (
                    <div className="space-y-1.5">
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <Check className="size-3.5 text-teal-700" aria-hidden />
                        <span className="tabular-nums">{f.time}</span>
                        <span className="font-medium text-teal-800">Published to students</span>
                        {f.cluster.conceptIds.map((id) => (
                          <Badge key={id} variant="secondary">
                            {conceptById(id)?.label}
                          </Badge>
                        ))}
                      </p>
                      <p className="font-medium">{f.cluster.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.cluster.questionIds.length} questions · {f.cluster.helperCount} helper{f.cluster.helperCount === 1 ? "" : "s"} opted in
                        {rooms.some((r) => r.clusterId === f.cluster._id) && <> · room open</>}
                      </p>
                      {!rooms.some((r) => r.clusterId === f.cluster._id) && (
                        <Button size="xs" variant="outline" onClick={() => openRoom(f.cluster)}>
                          <DoorOpen data-icon="inline-start" aria-hidden />
                          Open help room
                        </Button>
                      )}
                    </div>
                  )}
                  {f.kind === "room" && (
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <DoorOpen className="size-3.5" aria-hidden />
                          <span className="tabular-nums">{f.time}</span>
                          <span className={cn("font-medium", f.event === "nearly_full" ? "text-amber-700" : "text-foreground")}>
                            {f.event === "nearly_full" ? "Room nearly full" : "Room opened"}
                          </span>
                        </p>
                        <p className="font-medium">{f.room.title}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {conceptById(f.room.conceptId)?.label} · {rooms.find((r) => r._id === f.room._id)?.memberCount ?? f.room.memberCount} / {f.room.capacity} · {f.room.helperCount}{" "}
                          helper{f.room.helperCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      {rooms.some((r) => r._id === f.room._id) ? (
                        <Button size="xs" variant="outline" onClick={() => setRooms((rs) => rs.filter((r) => r._id !== f.room._id))}>
                          Close room
                        </Button>
                      ) : (
                        <Badge variant="secondary">closed</Badge>
                      )}
                    </div>
                  )}
                  {f.kind === "topic" && (
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">{f.time}</span>
                      Current topic → <span className="font-medium text-foreground">{conceptById(f.conceptId)?.label}</span>
                    </p>
                  )}
                </li>
              ))}
            </ol>

            <div className="border-t bg-muted/40 p-3">
              {grouping && picked.length > 0 ? (
                <ManualGroup
                  questionIds={picked}
                  onCancel={() => setGrouping(false)}
                  onCreate={(title) => {
                    const k: Cluster = {
                      _id: `k${clusters.length + 1}`,
                      title,
                      summary: "",
                      conceptIds: [...new Set(picked.map((id) => questionById(id).conceptId))],
                      questionIds: picked,
                      status: "published",
                      source: "manual",
                      confidence: null,
                      helperCount: 0,
                      time: "10:47",
                    };
                    setClusters((ks) => [...ks, k]);
                    setFeed((f) => [{ kind: "published", time: "10:47", cluster: k }, ...f]);
                    setPicked([]);
                    setGrouping(false);
                  }}
                />
              ) : (
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Inbox className="size-3.5" aria-hidden />
                    Raw questions are only visible here, never to students.
                  </span>
                  <Button size="sm" variant="outline" disabled={picked.length === 0} onClick={() => setGrouping(true)}>
                    Group selected ({picked.length})
                  </Button>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}

function SuggestionCard({
  cluster,
  time,
  onPublish,
  onDiscard,
  onSave,
}: {
  cluster: Cluster;
  time: string;
  onPublish: (k: Cluster) => void;
  onDiscard: (k: Cluster) => void;
  onSave: (k: Cluster) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(cluster.title);
  const [summary, setSummary] = useState(cluster.summary);
  return (
    <div className="-mx-2 space-y-2 rounded-xl border border-primary/30 bg-accent/50 px-3 py-2.5">
      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden />
        <span className="tabular-nums">{time}</span>
        <span className="font-medium text-foreground">Claude suggests a cluster</span>
        {cluster.conceptIds.map((id) => (
          <Badge key={id} variant="secondary">
            {conceptById(id)?.label}
          </Badge>
        ))}
        {cluster.confidence !== null && <span>{Math.round(cluster.confidence * 100)}% (not calibrated)</span>}
      </p>
      {editing ? (
        <div className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Cluster title" className="font-medium" />
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} rows={2} aria-label="Cluster summary" />
        </div>
      ) : (
        <div className="space-y-0.5">
          <p className="font-medium">{cluster.title}</p>
          <p className="text-xs text-muted-foreground">{cluster.summary}</p>
        </div>
      )}
      <details className="group/details text-xs">
        <summary className="cursor-pointer list-none text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
          <span className="mr-1 inline-block transition-transform duration-150 ease-out group-open/details:rotate-90" aria-hidden>
            ›
          </span>
          {cluster.questionIds.length} original questions
        </summary>
        <ul className="mt-1.5 space-y-1 border-l-2 pl-3">
          {cluster.questionIds.map((id) => (
            <li key={id}>{questionById(id).content}</li>
          ))}
        </ul>
      </details>
      <div className="flex gap-1.5">
        {editing ? (
          <>
            <Button
              size="sm"
              disabled={!title.trim()}
              onClick={() => {
                onSave({ ...cluster, title, summary });
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={() => onPublish(cluster)}>
              Publish
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDiscard(cluster)}>
              Discard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ManualGroup({ questionIds, onCreate, onCancel }: { questionIds: string[]; onCreate: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="enter space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onCreate(title.trim());
      }}
    >
      <p className="text-xs font-medium">Manual cluster from {questionIds.length} selected question{questionIds.length === 1 ? "" : "s"}</p>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        required
        autoFocus
        placeholder="Title, e.g. Tracing recursive return values"
        aria-label="Cluster title"
        className="bg-background"
      />
      <div className="flex gap-1.5">
        <Button type="submit" size="sm" disabled={!title.trim()}>
          Publish cluster
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail?: string; tone?: "warn" }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-1.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="flex items-baseline gap-1">
        <span className={cn("text-xl font-semibold tracking-tight tabular-nums", tone === "warn" && "text-rose-600")}>{value}</span>
        {detail && <span className="text-[11px] text-muted-foreground">{detail}</span>}
      </dd>
    </div>
  );
}

function JoinCode({ large }: { large: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-1.5">
      <div className="text-right">
        <p className="text-[11px] text-muted-foreground">Students join at /join/{session.code}</p>
        <p className={cn("font-mono font-bold tracking-[0.25em]", large ? "text-5xl" : "text-2xl")}>{session.code}</p>
      </div>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={copied ? "Link copied" : "Copy join link"}
        onClick={() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="text-teal-700" aria-hidden /> : <Copy aria-hidden />}
      </Button>
    </div>
  );
}

function Count({ n, label }: { n: number; label: string }) {
  return (
    <p className="rounded-xl border px-3 py-2">
      <span className="block text-2xl font-semibold tabular-nums">{n}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </p>
  );
}
