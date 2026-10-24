"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  DoorOpen,
  EyeOff,
  Inbox,
  MonitorPlay,
  Radio,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { ConceptGraph, LOW_SAMPLE } from "@/components/ConceptGraph";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LEVELS, PHASE_LABEL, type Phase } from "@/lib/levels";
import { cn } from "@/lib/utils";
import {
  CLUSTERS,
  CONCEPTS,
  EDGES,
  QUESTIONS,
  ROOMS,
  SESSION,
  conceptLabel,
  type Cluster,
  type Concept,
  type Question,
  type Room,
  type Counts,
} from "../fixtures";

type Order = "lecture" | "confused";
type AiRun = { status: "idle" | "running" | "ok" };

const confusedShare = (c: Concept) => (c.total === 0 ? 0 : c.counts.confused / c.total);
const sumCounts = (c: Counts) => c.confused + c.partial + c.can_explain;

export default function ControlRoomInstructor() {
  const [activeId, setActiveId] = useState(SESSION.activeConceptId);
  const [selectedId, setSelectedId] = useState<string>(SESSION.activeConceptId);
  const [phase, setPhase] = useState<Phase>(SESSION.phase);
  const [presenting, setPresenting] = useState(false);
  const [order, setOrder] = useState<Order>("lecture");
  const [clusters, setClusters] = useState<Cluster[]>(CLUSTERS);
  const [questions, setQuestions] = useState<Question[]>(QUESTIONS);
  const [rooms, setRooms] = useState<Room[]>(ROOMS);
  const [queueOpen, setQueueOpen] = useState(false);
  const [run, setRun] = useState<AiRun>({ status: "ok" });
  const [closed, setClosed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4500);
  }, []);

  // `counts` always holds the active phase so the rail, graph, inspector and totals agree; `pre`/`post` feed the comparison.
  const concepts = useMemo(
    () =>
      CONCEPTS.map((c) => {
        const counts = phase === "post" ? c.post : c.counts;
        return { ...c, pre: c.counts, counts, total: sumCounts(counts), openClusters: clusters.filter((k) => k.status === "published" && k.conceptIds.includes(c._id)).length };
      }),
    [clusters, phase],
  );
  const clusteredIds = useMemo(() => new Set(clusters.flatMap((k) => k.questionIds)), [clusters]);
  const questionsView = useMemo(() => questions.map((q) => ({ ...q, state: clusteredIds.has(q._id) ? ("clustered" as const) : ("pending" as const) })), [questions, clusteredIds]);
  const ordered = useMemo(
    () => (order === "lecture" ? concepts : [...concepts].sort((a, b) => confusedShare(b) - confusedShare(a))),
    [concepts, order],
  );
  const selected = concepts.find((c) => c._id === selectedId) ?? concepts[0];
  const responses = concepts.reduce((s, c) => s + c.total, 0);
  const confused = concepts.reduce((s, c) => s + c.counts.confused, 0);
  const pending = questionsView.filter((q) => q.state === "pending");
  const suggested = clusters.filter((k) => k.status === "suggested");
  const published = clusters.filter((k) => k.status === "published");

  function makeCurrent(id: string) {
    setActiveId(id);
    announce(`Current topic → ${conceptLabel(id)}. Students' answer bar switched to it.`);
  }
  function openRoom(conceptId: string, clusterId: string | null) {
    const cluster = clusters.find((k) => k._id === clusterId);
    const base = cluster?.title ?? conceptLabel(conceptId);
    const n = rooms.filter((r) => r.conceptId === conceptId).length + 1;
    setRooms((rs) => [...rs, { _id: `r${Date.now()}`, title: `${base} · room ${n}`, conceptId, clusterId, capacity: 6, members: [] }]);
    announce(`Help room opened for “${base}”. It is listed on every student's screen.`);
  }
  function closeRoom(id: string) {
    const room = rooms.find((r) => r._id === id);
    setRooms((rs) => rs.filter((r) => r._id !== id));
    if (room) announce(`Closed “${room.title}”.`);
  }
  function publish(id: string) {
    const k = clusters.find((c) => c._id === id);
    setClusters((ks) => ks.map((c) => (c._id === id ? { ...c, status: "published" } : c)));
    if (k) announce(`Published “${k.title}” — students can see it now.`);
  }
  function discard(id: string) {
    const k = clusters.find((c) => c._id === id);
    setClusters((ks) => ks.filter((c) => c._id !== id));
    if (k) announce(`Discarded “${k.title}”. Its questions are pending again.`);
  }
  function updateCluster(id: string, patch: Partial<Cluster>) {
    setClusters((ks) => ks.map((c) => (c._id === id ? { ...c, ...patch } : c)));
  }
  function groupManually(wanted: string[]) {
    const ids = wanted.filter((id) => pending.some((q) => q._id === id));
    if (ids.length === 0) return;
    const first = questions.find((q) => q._id === ids[0]);
    const conceptIds = [...new Set(questions.filter((q) => ids.includes(q._id)).map((q) => q.conceptId))];
    setClusters((ks) => [
      ...ks,
      {
        _id: `k${Date.now()}`,
        title: first ? first.content.slice(0, 48).replace(/[?.…]+$/, "") : "Manual cluster",
        summary: "",
        conceptIds,
        questionIds: ids,
        status: "suggested",
        source: "manual",
        confidence: null,
        helperCount: 0,
      },
    ]);
  }
  function suggest() {
    setRun({ status: "running" });
    setTimeout(() => {
      setRun({ status: "ok" });
      announce("Claude finished grouping. Review the suggestions before publishing.");
    }, 1800);
  }
  function closeSession() {
    setClosed(true);
    setQueueOpen(false);
    announce("Session closed. Students can no longer send signals or chat; the summary stays visible.");
  }
  function switchPhase(next: Phase) {
    setPhase(next);
    announce(`Signals now recorded as “${PHASE_LABEL[next]}”. Room check-ins write to this phase.`);
  }

  useEffect(() => {
    if (!queueOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setQueueOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queueOpen]);

  return (
    <div className="flex h-dvh min-h-[40rem] flex-col overflow-hidden">
      <TopBar
        phase={phase}
        onPhase={switchPhase}
        presenting={presenting}
        onPresenting={() => setPresenting((p) => !p)}
        metrics={{ participants: SESSION.participantCount, simulated: SESSION.simulatedCount, responses, confused, published: published.length, rooms: rooms.length }}
        notice={notice}
        closed={closed}
        onClose={closeSession}
      />

      <div className={cn("grid min-h-0 flex-1 grid-cols-[18rem_minmax(0,1fr)_22rem] border-t", closed && "opacity-60")} inert={closed}>
        <ConceptRail
          concepts={ordered}
          activeId={activeId}
          selectedId={selected._id}
          onSelect={setSelectedId}
          order={order}
          onOrder={setOrder}
          phase={phase}
        />

        <div className="relative grid min-h-0 grid-cols-[minmax(0,1fr)_22rem] col-span-2">
          <section className="min-h-0 overflow-y-auto border-r px-5 pt-4 pb-16" aria-label="Concept graph and live rooms">
            <ConceptGraph concepts={concepts} edges={EDGES} activeConceptId={activeId} selectedId={selected._id} onSelect={setSelectedId} />
            <RoomsStrip rooms={rooms} concepts={concepts} onOpen={(conceptId) => openRoom(conceptId, null)} onClose={closeRoom} onInspect={setSelectedId} />
          </section>

          <Inspector
            concept={selected}
            isActive={selected._id === activeId}
            phase={phase}
            clusters={clusters.filter((k) => k.conceptIds.includes(selected._id))}
            rooms={rooms.filter((r) => r.conceptId === selected._id)}
            onMakeCurrent={() => makeCurrent(selected._id)}
            onOpenRoom={(clusterId) => openRoom(selected._id, clusterId)}
            onCloseRoom={closeRoom}
            onReview={() => setQueueOpen(true)}
          />

          <QueueDrawer
            open={queueOpen}
            onOpenChange={setQueueOpen}
            presenting={presenting}
            pendingCount={pending.length}
            suggestedCount={suggested.length}
            publishedCount={published.length}
            run={run}
            onSuggest={suggest}
          >
            <QueueBody
              questions={questionsView}
              suggested={suggested}
              published={published}
              rooms={rooms}
              onHide={(id) => setQuestions((qs) => qs.filter((q) => q._id !== id))}
              onGroup={groupManually}
              onPublish={publish}
              onDiscard={discard}
              onUpdate={updateCluster}
              onOpenRoom={(k) => openRoom(k.conceptIds[0], k._id)}
            />
          </QueueDrawer>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- top bar */

function TopBar({
  phase,
  onPhase,
  presenting,
  onPresenting,
  metrics,
  notice,
  closed,
  onClose,
}: {
  phase: Phase;
  onPhase: (p: Phase) => void;
  presenting: boolean;
  onPresenting: () => void;
  closed: boolean;
  onClose: () => void;
  metrics: { participants: number; simulated: number; responses: number; confused: number; published: number; rooms: number };
  notice: string | null;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <header className="flex items-center gap-5 bg-card/80 px-5 py-2.5">
      <div className="flex min-w-0 items-center gap-4">
        <Brand />
        <Separator orientation="vertical" className="h-6!" />
        <div className="min-w-0">
          <p className="truncate font-heading text-[15px] leading-tight font-medium">{SESSION.title}</p>
          <p className="text-xs text-muted-foreground">
            Instructor · <span className="text-foreground">{PHASE_LABEL[phase]}</span> · {metrics.rooms} room{metrics.rooms === 1 ? "" : "s"} open
          </p>
        </div>
      </div>

      <dl className="flex items-center gap-4 rounded-full border bg-background px-4 py-1.5 text-sm" aria-label="Session metrics">
        <Stat label="participants" value={metrics.participants} hint={`incl. ${metrics.simulated} simulated`} />
        <Stat label="responses" value={metrics.responses} />
        <Stat label="confused" value={metrics.confused} tone={metrics.confused > 0 ? "warn" : undefined} />
        <Stat label="published" value={metrics.published} />
      </dl>

      <div className="flex-1 overflow-hidden">
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "enter truncate rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-foreground",
            !notice && "invisible",
          )}
          key={notice ?? "none"}
        >
          <Radio className="mr-1.5 inline size-3.5 -translate-y-px text-primary" aria-hidden />
          {notice ?? " "}
        </p>
      </div>

      <ToggleGroup
        aria-label="Signal phase"
        variant="outline"
        spacing={0}
        value={[phase]}
        onValueChange={(v) => {
          const next = v[0] as Phase | undefined;
          if (next && next !== phase) onPhase(next);
        }}
      >
        {(["pre", "post"] as const).map((p) => (
          <ToggleGroupItem key={p} value={p} size="sm" className="bg-background data-pressed:bg-primary data-pressed:text-primary-foreground">
            {PHASE_LABEL[p]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Button
        variant={presenting ? "default" : "outline"}
        size="sm"
        aria-pressed={presenting}
        onClick={onPresenting}
        title="While presenting, the raw question queue stays closed so student questions never reach the projector."
      >
        <MonitorPlay data-icon="inline-start" aria-hidden />
        {presenting ? "Presenting" : "Present"}
      </Button>

      <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-1.5">
        <div className="text-right">
          <p className="text-[11px] leading-none text-muted-foreground">/join/{SESSION.code}</p>
          <p className="font-mono text-2xl leading-tight font-bold tracking-[0.22em]">{SESSION.code}</p>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={copied ? "Link copied" : "Copy join link"}
          onClick={() => {
            navigator.clipboard
              .writeText(`${window.location.origin}/join/${SESSION.code}`)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
              .catch(() => setCopied(false));
          }}
        >
          {copied ? <Check className="text-emerald-600" aria-hidden /> : <Copy aria-hidden />}
        </Button>
      </div>

      {closed ? (
        <Badge variant="secondary" className="bg-red-100 text-red-900">
          Session closed
        </Badge>
      ) : (
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>Close session</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this session?</AlertDialogTitle>
            <AlertDialogDescription>Students can no longer send signals or chat. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it open</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClose}>
              Close session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}
    </header>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: "warn" }) {
  return (
    <div className="flex items-baseline gap-1.5" title={hint}>
      <dd className={cn("font-heading text-lg leading-none font-semibold tabular-nums", tone === "warn" && "text-destructive")}>{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

/* ------------------------------------------------------------ concept rail */

function ConceptRail({
  concepts,
  activeId,
  selectedId,
  onSelect,
  order,
  onOrder,
  phase,
}: {
  concepts: Concept[];
  activeId: string;
  selectedId: string;
  onSelect: (id: string) => void;
  order: Order;
  onOrder: (o: Order) => void;
  phase: Phase;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  function onKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-concept]") ?? []);
    const i = buttons.findIndex((b) => b === document.activeElement);
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : e.key === "ArrowDown" ? Math.min(i + 1, buttons.length - 1) : Math.max(i - 1, 0);
    buttons[next]?.focus();
    const id = buttons[next]?.dataset.concept;
    if (id) onSelect(id);
  }

  return (
    <aside id="per-concept" className="flex min-h-0 flex-col border-r bg-card/60" aria-labelledby="rail-heading">
      <div className="space-y-2 px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between">
          <h2 id="rail-heading" className="text-sm font-semibold">
            Concepts
          </h2>
          <span className="text-[11px] text-muted-foreground">{PHASE_LABEL[phase]}</span>
        </div>
        <ToggleGroup
          aria-label="Order concepts"
          variant="outline"
          spacing={0}
          size="sm"
          value={[order]}
          onValueChange={(v) => v[0] && onOrder(v[0] as Order)}
          className="w-full *:flex-1"
        >
          <ToggleGroupItem value="lecture" className="bg-background text-xs data-pressed:bg-foreground data-pressed:text-background">
            Lecture order
          </ToggleGroupItem>
          <ToggleGroupItem value="confused" className="bg-background text-xs data-pressed:bg-foreground data-pressed:text-background">
            Most confused first
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <ul ref={listRef} onKeyDown={onKeyDown} className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Per-concept distribution (text alternative to the graph)">
        {concepts.map((c) => {
          const isSelected = c._id === selectedId;
          const isActive = c._id === activeId;
          const low = c.total < LOW_SAMPLE;
          const summary = LEVELS.map((l) => `${c.counts[l.value]} ${l.label.toLowerCase()}`).join(", ");
          return (
            <li key={c._id}>
              <button
                type="button"
                data-concept={c._id}
                aria-current={isSelected ? "true" : undefined}
                aria-label={`${c.label}. N = ${c.total}: ${summary}.${isActive ? " Current topic." : ""}${c.openClusters ? ` ${c.openClusters} published cluster${c.openClusters === 1 ? "" : "s"}.` : ""}`}
                onClick={() => onSelect(c._id)}
                className={cn(
                  "pressable group/row block w-full rounded-lg border border-transparent px-2.5 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isSelected ? "border-foreground/80 bg-background" : "hover:bg-background/70",
                )}
              >
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <span className="relative flex size-2 shrink-0" title="Current topic">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
                      <span className="relative inline-flex size-2 rounded-full bg-primary" />
                    </span>
                  ) : (
                    <span className="size-2 shrink-0 rounded-full border border-border" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.label}</span>
                  {c.openClusters > 0 && (
                    <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white" aria-hidden>
                      {c.openClusters}
                    </span>
                  )}
                  <span className={cn("text-xs tabular-nums text-muted-foreground", low && "text-amber-700")}>N={c.total}</span>
                </div>
                <div className="mt-1.5 pl-4">
                  <DistributionBar tally={c} className="h-1.5" />
                  <p className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
                    {LEVELS.map((l) => (
                      <span key={l.value} className="flex items-center gap-1">
                        <span className={`inline-block size-1.5 rounded-full ${l.dot}`} aria-hidden />
                        {c.counts[l.value]}
                      </span>
                    ))}
                    {low && <span className="text-amber-700">{c.total === 0 ? "none" : "low"}</span>}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="space-y-1.5 border-t px-4 py-3">
        <Legend />
        <p className="text-[11px] text-muted-foreground">
          Self-reported understanding, not measured mastery. <kbd className="rounded border bg-background px-1">↑</kbd>{" "}
          <kbd className="rounded border bg-background px-1">↓</kbd> move, <kbd className="rounded border bg-background px-1">Enter</kbd> inspect.
        </p>
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------------- inspector */

function Inspector({
  concept,
  isActive,
  phase,
  clusters,
  rooms,
  onMakeCurrent,
  onOpenRoom,
  onCloseRoom,
  onReview,
}: {
  concept: Concept & { pre: Counts };
  isActive: boolean;
  phase: Phase;
  clusters: Cluster[];
  rooms: Room[];
  onMakeCurrent: () => void;
  onOpenRoom: (clusterId: string | null) => void;
  onCloseRoom: (id: string) => void;
  onReview: () => void;
}) {
  const low = concept.total < LOW_SAMPLE;
  const published = clusters.filter((k) => k.status === "published");
  const suggested = clusters.filter((k) => k.status === "suggested");
  return (
    <aside className="flex min-h-0 flex-col overflow-y-auto bg-card/60 pb-16" aria-label="Selected concept">
      <div className="space-y-3 px-5 pt-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isActive ? <Badge>Current topic</Badge> : <Badge variant="outline">Inspecting</Badge>}
            {low && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                {concept.total === 0 ? "no responses" : "low sample"}
              </Badge>
            )}
          </div>
          <h2 className="text-xl leading-tight font-semibold tracking-tight">{concept.label}</h2>
          <p className="text-sm text-muted-foreground">{concept.description}</p>
        </div>

        {isActive ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
            <Radio className="size-4 text-primary" aria-hidden />
            On every student&apos;s answer bar right now.
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={onMakeCurrent}>
            Make current topic
          </Button>
        )}
      </div>

      <div className="space-y-5 px-5 pt-5">
        <section className="space-y-2" aria-labelledby="insp-signals">
          <h3 id="insp-signals" className="text-sm font-semibold">
            Signals · {PHASE_LABEL[phase]}
          </h3>
          <DistributionBar tally={concept} className="h-3" />
          <ul className="space-y-1 text-sm">
            {LEVELS.map((l) => (
              <li key={l.value} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className={`inline-block size-2 rounded-full ${l.dot}`} aria-hidden />
                  {l.label}
                </span>
                <span className="tabular-nums">
                  <strong>{concept.counts[l.value]}</strong>
                  <span className="text-muted-foreground"> / {concept.total}</span>
                </span>
              </li>
            ))}
          </ul>
          {low && (
            <p className="text-sm text-amber-700">
              {concept.total === 0 ? "No responses yet." : `Low sample (N = ${concept.total}); treat the colour as tentative.`}
            </p>
          )}
        </section>

        <section className="space-y-2" aria-labelledby="insp-prepost">
          <h3 id="insp-prepost" className="text-sm font-semibold">
            Before vs after help
          </h3>
          <PhaseRow label="pre" tally={{ ...concept.pre, total: sumCounts(concept.pre) }} />
          <PhaseRow label="post" tally={{ ...concept.post, total: sumCounts(concept.post) }} />
          <p className="text-xs text-muted-foreground">Separate response sets. A shift is what students say, not verified learning.</p>
        </section>

        <Separator />

        <section className="space-y-2" aria-labelledby="insp-clusters">
          <div className="flex items-center justify-between">
            <h3 id="insp-clusters" className="text-sm font-semibold">
              Question clusters
            </h3>
            {suggested.length > 0 && (
              <Button size="xs" variant="ghost" onClick={onReview}>
                {suggested.length} to review
                <ArrowUpRight data-icon="inline-end" aria-hidden />
              </Button>
            )}
          </div>
          {published.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing published for this concept yet.</p>
          ) : (
            <ul className="space-y-2">
              {published.map((k) => {
                const room = rooms.find((r) => r.clusterId === k._id);
                return (
                  <li key={k._id} className="space-y-1.5 rounded-lg border bg-background p-3">
                    <p className="text-sm font-medium">{k.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {k.questionIds.length} question{k.questionIds.length === 1 ? "" : "s"} · {k.helperCount} helper{k.helperCount === 1 ? "" : "s"} opted in
                    </p>
                    {room ? (
                      <p className="text-xs text-muted-foreground">
                        Room open · <strong className="text-foreground">{room.members.length}</strong> / {room.capacity}
                      </p>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => onOpenRoom(k._id)}>
                        <DoorOpen data-icon="inline-start" aria-hidden />
                        Open help room
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-2" aria-labelledby="insp-rooms">
          <div className="flex items-center justify-between">
            <h3 id="insp-rooms" className="text-sm font-semibold">
              Help rooms
            </h3>
            <Button size="xs" variant="outline" onClick={() => onOpenRoom(null)}>
              Open room for this topic
            </Button>
          </div>
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No room open on {concept.label}.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {rooms.map((r) => (
                <li key={r._id} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {r.members.length} / {r.capacity} · {r.members.filter((m) => m.role === "helper").length} helper
                    </span>
                  </span>
                  <Button size="xs" variant="ghost" onClick={() => onCloseRoom(r._id)}>
                    Close
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}

function PhaseRow({ label, tally }: { label: Phase; tally: { confused: number; partial: number; can_explain: number; total?: number } }) {
  const total = tally.total ?? tally.confused + tally.partial + tally.can_explain;
  const t = { counts: tally, total };
  return (
    <div className="grid grid-cols-[2.5rem_1fr_4.5rem] items-center gap-2 text-xs">
      <span className="font-mono uppercase text-muted-foreground">{label}</span>
      <div role="img" aria-label={`${PHASE_LABEL[label]}: ${LEVELS.map((l) => `${l.label} ${tally[l.value]}`).join(", ")}, N = ${total}`}>
        <DistributionBar tally={t} />
      </div>
      <span className="tabular-nums text-muted-foreground">
        N = {total}
        {total === 0 ? <span className="ml-1 text-muted-foreground/60">none</span> : total < LOW_SAMPLE && <span className="ml-1 text-amber-600">low</span>}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------- rooms strip */

function RoomsStrip({
  rooms,
  concepts,
  onOpen,
  onClose,
  onInspect,
}: {
  rooms: Room[];
  concepts: Concept[];
  onOpen: (conceptId: string) => void;
  onClose: (id: string) => void;
  onInspect: (conceptId: string) => void;
}) {
  const [conceptId, setConceptId] = useState(concepts[0]._id);
  const items = concepts.map((c) => ({ value: c._id, label: c.label }));
  return (
    <section className="mt-4 space-y-2" aria-labelledby="rooms-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="rooms-heading" className="text-sm font-semibold">
          Live help rooms <span className="font-normal text-muted-foreground">({rooms.length})</span>
        </h2>
        <form
          className="flex items-center gap-2 text-xs text-muted-foreground"
          onSubmit={(e) => {
            e.preventDefault();
            onOpen(conceptId);
          }}
        >
          <label htmlFor="strip-concept">Open a room for</label>
          <Select items={items} value={conceptId} onValueChange={(v) => v && setConceptId(v)}>
            <SelectTrigger id="strip-concept" size="sm" aria-label="Topic" className="min-w-40 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((it) => (
                <SelectItem key={it.value} value={it.value}>
                  {it.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" variant="outline">
            Open
          </Button>
        </form>
      </div>
      {rooms.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
          <DoorOpen className="size-4" aria-hidden /> No open rooms. Open one from a published cluster in the inspector.
        </div>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {rooms.map((r) => {
            const full = r.members.length >= r.capacity;
            const helpers = r.members.filter((m) => m.role === "helper").length;
            return (
              <li key={r._id} className="enter flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <button type="button" className="underline-offset-3 hover:underline" onClick={() => onInspect(r.conceptId)}>
                      {conceptLabel(r.conceptId)}
                    </button>
                    <span className="tabular-nums">
                      <strong className="text-foreground">{r.members.length}</strong> / {r.capacity} · {helpers} helper{helpers === 1 ? "" : "s"}
                    </span>
                    {full && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                        full
                      </Badge>
                    )}
                  </p>
                </div>
                <Seats room={r} />
                <Button size="sm" variant="outline" onClick={() => onClose(r._id)}>
                  Close
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Seats({ room }: { room: Room }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {Array.from({ length: room.capacity }).map((_, i) => {
        const m = room.members[i];
        return (
          <span
            key={i}
            className={cn("size-2.5 rounded-sm", !m ? "border border-border" : m.role === "helper" ? "bg-emerald-500" : "bg-primary")}
          />
        );
      })}
    </span>
  );
}

/* --------------------------------------------------------------- queue drawer */

function QueueDrawer({
  open,
  onOpenChange,
  presenting,
  pendingCount,
  suggestedCount,
  publishedCount,
  run,
  onSuggest,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  presenting: boolean;
  pendingCount: number;
  suggestedCount: number;
  publishedCount: number;
  run: AiRun;
  onSuggest: () => void;
  children: React.ReactNode;
}) {
  const canOpen = !presenting;
  const isOpen = open && canOpen;
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 col-span-2 flex flex-col rounded-t-2xl border-t border-x bg-card transition-[height] duration-200 ease-out motion-reduce:transition-none",
        isOpen ? "h-[62%]" : "h-12",
      )}
      role="region"
      aria-label="Questions and clusters"
    >
      <div className="flex h-12 shrink-0 items-center gap-3 px-4">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
          aria-expanded={isOpen}
          aria-controls="queue-body"
          disabled={!canOpen}
          onClick={() => onOpenChange(!open)}
        >
          {isOpen ? <ChevronDown className="size-4 text-muted-foreground" aria-hidden /> : <ChevronUp className="size-4 text-muted-foreground" aria-hidden />}
          <span className="font-semibold">Questions &amp; clusters</span>
          {presenting ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <EyeOff className="size-3.5" aria-hidden />
              Raw questions hidden while presenting · {pendingCount} pending
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Chip tone={pendingCount > 0 ? "muted" : "muted"}>{pendingCount} pending</Chip>
              <Chip tone={suggestedCount > 0 ? "amber" : "muted"} pulse={suggestedCount > 0 && !isOpen}>
                {suggestedCount} to review
              </Chip>
              <Chip tone="muted">{publishedCount} published</Chip>
            </span>
          )}
        </button>
        <p className="hidden text-xs text-muted-foreground xl:block" aria-live="polite">
          {run.status === "running" ? "Claude is grouping…" : run.status === "ok" ? "AI suggestions ready · claude-sonnet · 2.1 s" : "No AI run yet"}
        </p>
        <Button size="sm" onClick={onSuggest} disabled={run.status === "running" || pendingCount === 0 || presenting}>
          <Sparkles data-icon="inline-start" aria-hidden className={cn(run.status === "running" && "animate-pulse")} />
          {run.status === "running" ? "Grouping…" : `Suggest clusters (${pendingCount})`}
        </Button>
      </div>
      <div id="queue-body" hidden={!isOpen} className="min-h-0 flex-1 overflow-y-auto border-t">
        {children}
      </div>
    </div>
  );
}

function Chip({ children, tone, pulse }: { children: React.ReactNode; tone: "amber" | "muted"; pulse?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 tabular-nums",
        tone === "amber" ? "border-amber-300 bg-amber-50 text-amber-900" : "bg-background text-muted-foreground",
      )}
    >
      {tone === "amber" && (
        <span className="relative flex size-1.5">
          {pulse && <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500/70 motion-reduce:hidden" />}
          <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
        </span>
      )}
      {children}
    </span>
  );
}

function QueueBody({
  questions,
  suggested,
  published,
  rooms,
  onHide,
  onGroup,
  onPublish,
  onDiscard,
  onUpdate,
  onOpenRoom,
}: {
  questions: Question[];
  suggested: Cluster[];
  published: Cluster[];
  rooms: Room[];
  onHide: (id: string) => void;
  onGroup: (ids: string[]) => void;
  onPublish: (id: string) => void;
  onDiscard: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Cluster>) => void;
  onOpenRoom: (k: Cluster) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const selected = picked.filter((id) => questions.some((q) => q._id === id && q.state === "pending"));
  const toggle = (id: string) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] divide-x">
      <section className="space-y-3 p-4" aria-labelledby="queue-heading">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 id="queue-heading" className="text-sm font-semibold">
              Moderation queue
            </h3>
            <p className="text-xs text-muted-foreground">Raw questions are only visible here. Tick pending ones to group them by hand.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={selected.length === 0}
            onClick={() => {
              onGroup(selected);
              setPicked([]);
            }}
          >
            Group selected ({selected.length})
          </Button>
        </div>
        {questions.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
            <Inbox className="size-4" aria-hidden /> No questions yet.
          </div>
        ) : (
          <ul className="divide-y rounded-lg border bg-background">
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
                      <Badge variant="secondary">{conceptLabel(q.conceptId)}</Badge>
                      <span className="tabular-nums">{q.minutesAgo} min ago</span>
                      {q.state === "clustered" && <span className="text-emerald-700">in a cluster</span>}
                      {q.isSimulated && <Badge variant="outline">simulated</Badge>}
                    </p>
                  </div>
                  <Button size="xs" variant="ghost" onClick={() => onHide(q._id)}>
                    Hide
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4 p-4" aria-labelledby="clusters-heading">
        <div>
          <h3 id="clusters-heading" className="text-sm font-semibold">
            Suggested by Claude — review before publishing ({suggested.length})
          </h3>
          <p className="text-xs text-muted-foreground">Edit the title or summary, then publish. Students only ever see published clusters.</p>
        </div>
        {suggested.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
        ) : (
          <ul className="space-y-3">
            {suggested.map((k) => (
              <ClusterCard
                key={k._id}
                cluster={k}
                onUpdate={(patch) => onUpdate(k._id, patch)}
                actions={
                  <>
                    <Button size="sm" onClick={() => onPublish(k._id)}>
                      Publish
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDiscard(k._id)}>
                      Discard
                    </Button>
                  </>
                }
              />
            ))}
          </ul>
        )}
        <div>
          <h3 className="text-sm font-semibold">Published ({published.length})</h3>
        </div>
        <ul className="space-y-3">
          {published.map((k) => {
            const kRooms = rooms.filter((r) => r.clusterId === k._id);
            return (
              <ClusterCard
                key={k._id}
                cluster={k}
                onUpdate={(patch) => onUpdate(k._id, patch)}
                footer={
                  kRooms.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No help room open for this cluster yet.</p>
                  ) : (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {kRooms.map((r) => (
                        <li key={r._id}>
                          <span className="font-medium text-foreground">{r.title}</span> · {r.members.length} / {r.capacity}
                        </li>
                      ))}
                    </ul>
                  )
                }
                actions={
                  <>
                    <Button size="sm" onClick={() => onOpenRoom(k)}>
                      <DoorOpen data-icon="inline-start" aria-hidden />
                      Open help room
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDiscard(k._id)}>
                      Unpublish &amp; discard
                    </Button>
                  </>
                }
              />
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function ClusterCard({
  cluster,
  onUpdate,
  actions,
  footer,
}: {
  cluster: Cluster;
  onUpdate: (patch: Partial<Cluster>) => void;
  actions: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(cluster.title);
  const [summary, setSummary] = useState(cluster.summary);
  const qs = cluster.questionIds.map((id) => QUESTIONS.find((q) => q._id === id)).filter(Boolean) as Question[];
  return (
    <li className="enter space-y-3 rounded-xl border bg-background p-4">
      {editing ? (
        <div className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Cluster title" className="font-medium" />
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} rows={2} aria-label="Cluster summary" />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!title.trim()}
              onClick={() => {
                onUpdate({ title, summary });
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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h4 className="font-heading font-medium">{cluster.title}</h4>
            {cluster.summary && <p className="text-sm text-muted-foreground">{cluster.summary}</p>}
            <p className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              {cluster.conceptIds.map((id) => (
                <Badge key={id} variant="secondary">
                  {conceptLabel(id)}
                </Badge>
              ))}
              <span>{cluster.source === "ai" ? "suggested by Claude" : "grouped manually"}</span>
              {cluster.confidence !== null && <span>model confidence {Math.round(cluster.confidence * 100)}% (not calibrated)</span>}
            </p>
          </div>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setTitle(cluster.title);
              setSummary(cluster.summary);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        </div>
      )}
      {footer}
      <details open={cluster.status === "suggested"} className="group/details text-sm">
        <summary className="cursor-pointer list-none text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
          <span className="mr-1 inline-block transition-transform duration-150 ease-out group-open/details:rotate-90" aria-hidden>
            ›
          </span>
          {qs.length} original question{qs.length === 1 ? "" : "s"}
        </summary>
        <ul className="mt-2 space-y-1.5 border-l-2 pl-3">
          {qs.map((q) => (
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
      <div className="flex gap-2">{actions}</div>
    </li>
  );
}
