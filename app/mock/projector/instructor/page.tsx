"use client";

import { useEffect, useId, useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, DoorOpen, EyeOff, Lock, Sparkles, X } from "lucide-react";
import { Brand } from "@/components/Brand";
import { LOW_SAMPLE, scoreColors } from "@/components/ConceptGraph";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LEVELS, PHASE_LABEL, type Phase } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { ProjectorGraph } from "./ProjectorGraph";
import {
  type Cluster,
  type Room,
  clusters as fixtureClusters,
  concepts as fixtureConcepts,
  conceptById,
  edges,
  labelsFor,
  questionById,
  questions,
  rooms as fixtureRooms,
  session,
} from "../fixtures";

type DrawerTab = "queue" | "clusters" | "prepost" | "session";
const DRAWER_TABS: { id: DrawerTab; label: string }[] = [
  { id: "queue", label: "Question queue" },
  { id: "clusters", label: "Clusters" },
  { id: "prepost", label: "Before vs after" },
  { id: "session", label: "Session" },
];

export default function InstructorProjectorMock() {
  const [activeId, setActiveId] = useState(session.activeConceptId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(session.phase);
  const [clusters, setClusters] = useState<Cluster[]>(fixtureClusters);
  const [rooms, setRooms] = useState<Room[]>(fixtureRooms);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("queue");
  const [toast, setToast] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [selectedQs, setSelectedQs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const published = clusters.filter((c) => c.status === "published");
  const suggested = clusters.filter((c) => c.status === "suggested");
  const clusteredIds = new Set(published.flatMap((c) => c.questionIds));
  const pending = questions.filter((q) => q.state !== "hidden" && !hidden.includes(q._id) && !clusteredIds.has(q._id));
  const visibleClusteredIds = new Set([...clusteredIds].filter((id) => !hidden.includes(id)));
  // The graph and metrics follow the selected signal phase; the comparison panel keeps both tallies.
  const concepts = fixtureConcepts.map((c) => ({
    ...c,
    counts: phase === "pre" ? c.counts : c.post,
    total: phase === "pre" ? c.total : c.postTotal,
    openClusters: published.filter((k) => k.conceptIds.includes(c._id)).length,
  }));
  const responses = concepts.reduce((s, c) => s + c.total, 0);
  const confused = concepts.reduce((s, c) => s + c.counts.confused, 0);
  const active = conceptById[activeId];
  const focus = concepts.find((c) => c._id === (selectedId ?? activeId))!;

  const announce = (msg: string) => setToast(msg);
  const makeCurrent = (id: string) => {
    setActiveId(id);
    announce(`Current topic is now “${conceptById[id].label}” — students see it pinned.`);
  };
  const publish = (id: string) => {
    setClusters((cs) => cs.map((c) => (c._id === id ? { ...c, status: "published", publishedAt: "10:29" } : c)));
    announce(`Published “${clusters.find((c) => c._id === id)?.title}” — visible to students now.`);
  };
  const discard = (id: string) => {
    setClusters((cs) => cs.filter((c) => c._id !== id));
    announce("Cluster discarded. Its questions are back in the queue.");
  };
  const openRoom = (conceptId: string, cluster?: Cluster) => {
    const room: Room = {
      _id: `r${rooms.length + 1}`,
      title: cluster?.title ?? conceptById[conceptId].label,
      conceptId,
      clusterId: cluster?._id ?? null,
      capacity: 6,
      members: [],
      isMember: false,
      myRole: null,
    };
    setRooms((rs) => [...rs, room]);
    announce(`Help room “${room.title}” opened — students can join from their Help tab.`);
  };
  const closeRoom = (id: string) => {
    setRooms((rs) => rs.filter((r) => r._id !== id));
    announce("Room closed. Members were sent back to the session.");
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Projector top bar: the one thing a late student needs is the code. */}
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-6 px-6 py-3 xl:px-8">
          <div className="min-w-0 flex-1 space-y-1">
            <Brand />
            <h1 className="truncate font-heading text-2xl font-semibold tracking-tight xl:text-3xl">{session.title}</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedId(activeId);
              document.getElementById("concept-focus")?.scrollIntoView({ block: "nearest" });
            }}
            className="pressable flex items-center gap-3 rounded-2xl border-2 border-primary bg-accent px-5 py-2.5 text-left outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
            aria-label={`Current topic: ${active.label}. Show its details.`}
          >
            <span className="relative flex size-3 shrink-0" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
              <span className="relative inline-flex size-3 rounded-full bg-primary" />
            </span>
            <span>
              <span className="block text-xs font-bold tracking-wide text-primary uppercase">Now</span>
              <span className="block font-heading text-2xl leading-none font-semibold">{active.label}</span>
            </span>
          </button>
          <div className="flex items-center gap-4 rounded-2xl border-2 bg-background px-5 py-2.5">
            <PseudoQr code={session.code} />
            <div>
              <p className="text-sm font-semibold text-muted-foreground">
                Join at <span className="text-foreground">{session.joinHost}</span>
              </p>
              <p className="font-mono text-5xl leading-none font-bold tracking-[0.2em] xl:text-6xl">{session.code}</p>
            </div>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={copied ? "Link copied" : "Copy join link"}
              className="self-start"
              onClick={() => {
                navigator.clipboard?.writeText(`https://${session.joinHost}/${session.code}`).catch(() => undefined);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="text-teal-700" aria-hidden /> : <Copy aria-hidden />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-5 px-6 py-5 pb-32 xl:px-8">
        <div className="sr-only" aria-live="polite">
          {toast}
        </div>
        {toast && (
          <div className="enter fixed top-28 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border-2 border-primary bg-card px-5 py-2.5 text-base font-medium">
            {toast}
            <button type="button" aria-label="Dismiss" onClick={() => setToast(null)} className="-mr-1 rounded-full p-1 hover:bg-muted">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}

        <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border bg-card px-5 py-3" aria-label="Session metrics">
          <Metric label="Joined" value={session.participantCount} />
          <Metric label="Responses" value={responses} detail={phase === "pre" ? "before help" : "after help"} />
          <Metric
            label="Confused"
            value={`${Math.round((confused / Math.max(responses, 1)) * 100)}%`}
            detail={`${confused} of ${responses}`}
            tone={confused / Math.max(responses, 1) > 0.25 ? "warn" : undefined}
          />
          <Metric label="Published clusters" value={published.length} />
          <Metric label="Help rooms" value={rooms.length} detail="open" />
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Signals</span>
            <ToggleGroup
              aria-label="Signal phase"
              variant="outline"
              spacing={0}
              value={[phase]}
              onValueChange={(v) => {
                const next = v[0] as Phase | undefined;
                if (next && next !== phase) {
                  setPhase(next);
                  announce(`Signal phase switched to “${PHASE_LABEL[next]}”. Room check-ins now record here.`);
                }
              }}
            >
              {(["pre", "post"] as const).map((p) => (
                <ToggleGroupItem key={p} value={p} className="bg-background data-pressed:bg-primary data-pressed:text-primary-foreground">
                  {PHASE_LABEL[p]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_20rem]" aria-label="Concept graph and details">
          <figure className="flex flex-col overflow-hidden rounded-2xl border bg-card">
            <ProjectorGraph concepts={concepts} edges={edges} activeConceptId={activeId} selectedId={selectedId} onSelect={setSelectedId} />
            <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t px-5 py-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Self-reported understanding</span>
              <span className="flex items-center gap-2">
                confused
                <span
                  className="inline-block h-2 w-20 rounded-full"
                  style={{ background: `linear-gradient(to right, ${scoreColors(0).accent}, ${scoreColors(0.5).accent}, ${scoreColors(1).accent})` }}
                  aria-hidden
                />
                can explain
              </span>
              <span>dashed = N &lt; {LOW_SAMPLE}</span>
              <span>arrow = prerequisite</span>
              <span>Student confidence, not measured mastery</span>
              <a href="#per-concept" className="ml-auto text-foreground underline underline-offset-3 hover:text-muted-foreground">
                Text version below
              </a>
            </figcaption>
          </figure>

          <Card id="concept-focus" aria-label="Concept details" className="h-fit xl:sticky xl:top-28">
            <CardHeader>
              <div className="flex flex-wrap gap-1.5">
                {focus._id === activeId ? <Badge>Current topic</Badge> : <Badge variant="outline">Selected</Badge>}
                {focus.openClusters > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                    {focus.openClusters} published cluster{focus.openClusters === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl" render={<h2 />}>
                {focus.label}
              </CardTitle>
              <CardDescription>{focus.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <DistributionBar tally={focus} className="h-4" />
                <ul className="space-y-1 text-sm">
                  {LEVELS.map((l) => (
                    <li key={l.value} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className={`inline-block size-2.5 rounded-full ${l.dot}`} aria-hidden />
                        {l.label}
                      </span>
                      <span className="tabular-nums">
                        <strong>{focus.counts[l.value]}</strong>
                        <span className="text-muted-foreground"> / {focus.total}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {focus.total < LOW_SAMPLE && (
                  <p className="text-sm text-amber-700">
                    {focus.total === 0 ? "No responses yet." : `Low sample (N = ${focus.total}); treat the colour as tentative.`}
                  </p>
                )}
              </div>
              {focus._id !== activeId ? (
                <Button size="lg" className="w-full" onClick={() => makeCurrent(focus._id)}>
                  Make current topic
                </Button>
              ) : (
                <p className="rounded-lg bg-accent px-3 py-2 text-sm">Students see this topic pinned at the top of their screen.</p>
              )}
              <Button variant="outline" size="lg" className="w-full" onClick={() => openRoom(focus._id)}>
                <DoorOpen data-icon="inline-start" aria-hidden />
                Open help room for this concept
              </Button>
              <Separator />
              <div className="space-y-2 text-sm">
                <h3 className="font-medium">Published question clusters</h3>
                {published.filter((c) => c.conceptIds.includes(focus._id)).length === 0 ? (
                  <p className="text-muted-foreground">None published for this concept yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {published
                      .filter((c) => c.conceptIds.includes(focus._id))
                      .map((c) => (
                        <li key={c._id} className="rounded-lg border bg-background p-3">
                          <p className="font-medium">{c.title}</p>
                          <p className="text-muted-foreground">{c.summary}</p>
                        </li>
                      ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">Original question text is in the instructor-only drawer.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_20rem]" aria-label="Per-concept distribution and help rooms">
          <div className="space-y-3" id="per-concept" aria-labelledby="per-concept-heading">
            <div>
              <h2 id="per-concept-heading" className="font-heading text-xl font-semibold tracking-tight">
                Per-concept distribution
              </h2>
              <p className="text-sm text-muted-foreground">Text alternative to the graph colours. Click a row to focus it above.</p>
            </div>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {concepts.map((c) => (
                <li key={c._id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c._id)}
                    className={cn(
                      "pressable w-full rounded-xl border bg-card p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      c._id === activeId && "border-primary ring-2 ring-primary/30",
                      c._id === focus._id && c._id !== activeId && "border-foreground",
                    )}
                  >
                    <p className="flex flex-wrap items-center gap-2 font-heading text-base font-medium">
                      {c.label}
                      {c._id === activeId && <Badge>now</Badge>}
                    </p>
                    <p className="mb-2 text-xs tabular-nums text-muted-foreground">
                      N = {c.total}
                      {c.total < LOW_SAMPLE && <span className="ml-2 text-amber-600">{c.total === 0 ? "no responses" : "low sample"}</span>}
                    </p>
                    <DistributionBar tally={c} />
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {LEVELS.map((l) => (
                        <span key={l.value} className="flex items-center gap-1.5 tabular-nums">
                          <span className={`inline-block size-2 rounded-full ${l.dot}`} aria-hidden />
                          {l.label}: <strong className="text-foreground">{c.counts[l.value]}</strong>
                        </span>
                      ))}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <Card aria-labelledby="room-status" className="h-fit">
            <CardHeader>
              <CardTitle id="room-status" render={<h2 />}>
                Help rooms (live)
              </CardTitle>
              <CardDescription>Rooms are pseudonymous and visible to the class; open one from a cluster or a concept.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <RoomOpener onOpen={(cid) => openRoom(cid)} />
              {rooms.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">No open rooms.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {rooms.map((r) => {
                    const helpers = r.members.filter((m) => m.role === "helper").length;
                    const full = r.members.length >= r.capacity;
                    return (
                      <li key={r._id} className="enter space-y-1 rounded-lg border bg-background p-3">
                        <p className="font-medium">{r.title}</p>
                        <p className="text-muted-foreground">
                          {conceptById[r.conceptId].label} · <strong className="text-foreground">{r.members.length}</strong> / {r.capacity} · {helpers} helper
                          {helpers === 1 ? "" : "s"}
                          {full && (
                            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-900">
                              full
                            </Badge>
                          )}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
                            <span className="rounded-full bg-primary" style={{ width: `${(r.members.length / r.capacity) * 100}%` }} />
                          </span>
                          <Button size="xs" variant="ghost" onClick={() => closeRoom(r._id)}>
                            Close room
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Instructor-only drawer: closed by default so nothing raw ever reaches the projector by accident. */}
      <div className={cn("fixed inset-x-0 bottom-0 z-40 flex flex-col", drawerOpen && "top-24")}>
        {drawerOpen && <button type="button" aria-label="Close instructor drawer" className="flex-1 bg-foreground/20" onClick={() => setDrawerOpen(false)} />}
        <div className={cn("border-t-2 border-foreground bg-card", drawerOpen && "flex max-h-[72vh] flex-col")}>
          <button
            type="button"
            aria-expanded={drawerOpen}
            aria-controls={drawerId}
            onClick={() => setDrawerOpen((o) => !o)}
            className={cn(
              "flex w-full items-center gap-4 px-6 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
              drawerOpen ? "bg-foreground text-background" : "bg-card hover:bg-muted",
            )}
          >
            <span className={cn("grid size-9 place-items-center rounded-full", drawerOpen ? "bg-background/15" : "bg-foreground text-background")}>
              {drawerOpen ? <EyeOff className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-heading text-base font-semibold">
                {drawerOpen ? "Instructor only — not for the projector. Press Esc to hide." : "Instructor only"}
              </span>
              <span className={cn("block text-sm", drawerOpen ? "text-background/80" : "text-muted-foreground")}>
                {pending.length} pending question{pending.length === 1 ? "" : "s"} · {suggested.length} suggested cluster{suggested.length === 1 ? "" : "s"} to
                review · before/after comparison · session controls
              </span>
            </span>
            {!drawerOpen && pending.length > 0 && (
              <span className="relative flex size-3" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60 motion-reduce:hidden" />
                <span className="relative inline-flex size-3 rounded-full bg-destructive" />
              </span>
            )}
            {drawerOpen ? <ChevronDown className="size-5" aria-hidden /> : <ChevronUp className="size-5" aria-hidden />}
          </button>

          {drawerOpen && (
            <div id={drawerId} className="flex min-h-0 flex-1 flex-col">
              <div role="tablist" aria-label="Instructor tools" className="flex gap-1 border-b px-6 pt-3">
                {DRAWER_TABS.map((t) => {
                  const count = t.id === "queue" ? pending.length : t.id === "clusters" ? suggested.length : 0;
                  const selected = drawerTab === t.id;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      onClick={() => setDrawerTab(t.id)}
                      className={cn(
                        "pressable -mb-px flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        selected ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t.label}
                      {count > 0 && <Badge variant={selected ? "default" : "secondary"}>{count}</Badge>}
                    </button>
                  );
                })}
              </div>
              <div role="tabpanel" className="mx-auto w-full max-w-[1440px] min-h-0 flex-1 overflow-y-auto px-6 py-4 xl:px-8">
                {drawerTab === "queue" && (
                  <QueuePanel
                    pending={pending}
                    clusteredIds={visibleClusteredIds}
                    selected={selectedQs}
                    onToggle={(id) => setSelectedQs((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
                    onHide={(id) => setHidden((h) => [...h, id])}
                    onSuggest={() => {
                      setDrawerTab("clusters");
                      announce("Claude is grouping pending questions… suggestions appear under Clusters.");
                    }}
                  />
                )}
                {drawerTab === "clusters" && (
                  <ClustersPanel suggested={suggested} published={published} rooms={rooms} onPublish={publish} onDiscard={discard} onOpenRoom={(c) => openRoom(c.conceptIds[0], c)} />
                )}
                {drawerTab === "prepost" && <PrePostPanel concepts={fixtureConcepts} />}
                {drawerTab === "session" && (
                  <SessionPanel
                    phase={phase}
                    onPhase={(p) => {
                      setPhase(p);
                      announce(`Signal phase switched to “${PHASE_LABEL[p]}”.`);
                    }}
                    onClose={() => announce("Session closed (mock). Students can no longer send signals or chat.")}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: number | string; detail?: string; tone?: "warn" }) {
  return (
    <p className="flex items-baseline gap-2">
      <span className={cn("font-heading text-3xl font-semibold tracking-tight tabular-nums", tone === "warn" && "text-destructive")}>{value}</span>
      <span className="text-sm leading-tight text-muted-foreground">
        {label}
        {detail && <span className="block text-xs">{detail}</span>}
      </span>
    </p>
  );
}

/** Deterministic QR-looking placeholder. A real build swaps this for a generated code of the join URL. */
function PseudoQr({ code }: { code: string }) {
  const size = 21;
  let seed = 0;
  for (const ch of code) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < size * size; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    cells.push(((seed >>> 16) & 1) === 1);
  }
  const finder = (x: number, y: number) => {
    const inFinder = (fx: number, fy: number) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7;
    if (!(inFinder(0, 0) || inFinder(size - 7, 0) || inFinder(0, size - 7))) return null;
    const fx = x < 7 ? 0 : size - 7;
    const fy = y < 7 ? 0 : size - 7;
    const dx = x - fx;
    const dy = y - fy;
    const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
    return ring === 3 || ring <= 1;
  };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="size-24 shrink-0 rounded-md bg-white p-1 ring-1 ring-border" shapeRendering="crispEdges" role="img" aria-label={`QR code for the join link, session ${code}`}>
      {Array.from({ length: size * size }, (_, i) => {
        const x = i % size;
        const y = Math.floor(i / size);
        const f = finder(x, y);
        const on = f === null ? cells[i] : f;
        return on ? <rect key={i} x={x} y={y} width={1} height={1} fill="oklch(0.3 0.065 252)" /> : null;
      })}
    </svg>
  );
}

function RoomOpener({ onOpen }: { onOpen: (conceptId: string) => void }) {
  const [conceptId, setConceptId] = useState(fixtureConcepts[0]._id);
  const items = fixtureConcepts.map((c) => ({ value: c._id, label: c.label }));
  return (
    <form
      className="flex flex-wrap items-center gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        onOpen(conceptId);
      }}
    >
      <label htmlFor="instructor-room-concept" className="w-full text-muted-foreground">
        Open a help room for
      </label>
      <Select items={items} value={conceptId} onValueChange={(v) => v && setConceptId(v)}>
        <SelectTrigger id="instructor-room-concept" size="sm" aria-label="Topic" className="min-w-0 flex-1 bg-background">
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
      <Button type="submit" size="sm">
        Open
      </Button>
    </form>
  );
}

function QueuePanel({
  pending,
  clusteredIds,
  selected,
  onToggle,
  onHide,
  onSuggest,
}: {
  pending: typeof questions;
  clusteredIds: Set<string>;
  selected: string[];
  onToggle: (id: string) => void;
  onHide: (id: string) => void;
  onSuggest: () => void;
}) {
  const rows = questions.filter((q) => clusteredIds.has(q._id) || pending.some((p) => p._id === q._id));
  const picked = selected.filter((id) => pending.some((p) => p._id === id));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight">Moderation queue</h2>
          <p className="text-sm text-muted-foreground">
            Raw questions are only visible here. Last AI run 10:16 · claude-sonnet · 2.8 s. Tick questions to group them by hand if suggestions fail.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={picked.length === 0}>
            Group selected ({picked.length}) into a cluster
          </Button>
          <Button size="lg" onClick={onSuggest} disabled={pending.length === 0}>
            <Sparkles data-icon="inline-start" aria-hidden />
            Suggest clusters ({pending.length} pending)
          </Button>
        </div>
      </div>
      <ul className="divide-y rounded-xl border bg-background">
        {rows.map((q) => {
          const isPending = !clusteredIds.has(q._id);
          const checked = selected.includes(q._id);
          return (
            <li key={q._id} className={cn("flex items-start gap-3 p-3 text-sm", checked && "bg-muted/60")}>
              <Checkbox aria-label="Select question for manual grouping" checked={checked} disabled={!isPending} onCheckedChange={() => onToggle(q._id)} className="mt-0.5" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="break-words">{q.content}</p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{conceptById[q.conceptId].label}</Badge>
                  <span className="tabular-nums">{q.createdAt}</span>
                  {!isPending && <span className="text-teal-800">in a published cluster</span>}
                </p>
              </div>
              {isPending && (
                <Button size="xs" variant="ghost" onClick={() => onHide(q._id)}>
                  Hide
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ClustersPanel({
  suggested,
  published,
  rooms,
  onPublish,
  onDiscard,
  onOpenRoom,
}: {
  suggested: Cluster[];
  published: Cluster[];
  rooms: Room[];
  onPublish: (id: string) => void;
  onDiscard: (id: string) => void;
  onOpenRoom: (c: Cluster) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Suggested by Claude — review before publishing</h2>
        {suggested.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">Nothing waiting. Press “Suggest clusters” in the queue.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {suggested.map((c) => (
              <ClusterCard key={c._id} cluster={c}>
                <Button onClick={() => onPublish(c._id)}>Publish</Button>
                <Button variant="ghost">Edit</Button>
                <Button variant="ghost" onClick={() => onDiscard(c._id)}>
                  Discard
                </Button>
              </ClusterCard>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Published ({published.length}) — what students can see</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {published.map((c) => {
            const clusterRooms = rooms.filter((r) => r.clusterId === c._id);
            return (
              <ClusterCard key={c._id} cluster={c} rooms={clusterRooms}>
                <Button onClick={() => onOpenRoom(c)}>Open help room</Button>
                <Button variant="ghost" onClick={() => onDiscard(c._id)}>
                  Unpublish &amp; discard
                </Button>
              </ClusterCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ClusterCard({ cluster, rooms = [], children }: { cluster: Cluster; rooms?: Room[]; children: React.ReactNode }) {
  return (
    <Card className="enter">
      <CardHeader>
        <CardTitle render={<h4 />}>{cluster.title}</CardTitle>
        <CardDescription>{cluster.summary}</CardDescription>
        <p className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
          {labelsFor(cluster.conceptIds).map((l) => (
            <Badge key={l} variant="secondary">
              {l}
            </Badge>
          ))}
          <span>{cluster.source === "ai" ? "suggested by Claude" : "grouped manually"}</span>
          {cluster.confidence !== null && <span>model confidence {Math.round(cluster.confidence * 100)}% (not calibrated)</span>}
          <span>
            {cluster.helperCount} helper{cluster.helperCount === 1 ? "" : "s"} opted in
          </span>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rooms.length > 0 && (
          <ul className="space-y-1 text-xs">
            {rooms.map((r) => (
              <li key={r._id} className="text-muted-foreground">
                <span className="font-medium text-foreground">{r.title}</span> · {r.members.length} / {r.capacity} members
              </li>
            ))}
          </ul>
        )}
        <details open={cluster.status === "suggested"} className="group/details">
          <summary className="cursor-pointer list-none text-sm text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span className="mr-1 inline-block transition-transform duration-150 ease-out group-open/details:rotate-90" aria-hidden>
              ›
            </span>
            {cluster.questionIds.length} original questions
          </summary>
          <ul className="mt-2 space-y-1.5 border-l-2 pl-3 text-sm">
            {cluster.questionIds.map((id) => (
              <li key={id} className="break-words">
                {questionById[id].content}
              </li>
            ))}
          </ul>
        </details>
      </CardContent>
      <CardFooter className="gap-2">{children}</CardFooter>
    </Card>
  );
}

function PrePostPanel({ concepts }: { concepts: typeof fixtureConcepts }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight">Before vs after peer help</h2>
        <p className="text-sm text-muted-foreground">
          Self-reported understanding per phase. Each bar shows its own N; the two phases are separate response sets. A shift here measures what
          students <em>say</em>, not verified learning gains.
        </p>
      </div>
      <ul className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
        {concepts.map((c) => (
          <li key={c._id} className="space-y-1.5">
            <p className="text-sm font-medium">{c.label}</p>
            {(["pre", "post"] as const).map((p) => {
              const tally = p === "pre" ? { counts: c.counts, total: c.total } : { counts: c.post, total: c.postTotal };
              return (
                <div key={p} className="grid grid-cols-[3rem_1fr_7rem] items-center gap-2 text-xs">
                  <span className="font-mono uppercase text-muted-foreground">{p}</span>
                  <div role="img" aria-label={`${PHASE_LABEL[p]}: ${LEVELS.map((l) => `${l.label} ${tally.counts[l.value]}`).join(", ")}, N = ${tally.total}`}>
                    <DistributionBar tally={tally} />
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    N = {tally.total}
                    {tally.total === 0 ? <span className="ml-1 text-muted-foreground/60">none</span> : tally.total < LOW_SAMPLE && <span className="ml-1 text-amber-600">low</span>}
                  </span>
                </div>
              );
            })}
          </li>
        ))}
      </ul>
      <Legend />
    </div>
  );
}

function SessionPanel({ phase, onPhase, onClose }: { phase: Phase; onPhase: (p: Phase) => void; onClose: () => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle render={<h2 />}>Signal phase</CardTitle>
          <CardDescription>Switch to “after help” once rooms are running so check-ins land in a separate response set.</CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup aria-label="Signal phase" variant="outline" spacing={0} value={[phase]} onValueChange={(v) => v[0] && v[0] !== phase && onPhase(v[0] as Phase)}>
            {(["pre", "post"] as const).map((p) => (
              <ToggleGroupItem key={p} value={p} className="bg-background data-pressed:bg-primary data-pressed:text-primary-foreground">
                {PHASE_LABEL[p]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle render={<h2 />}>End of lecture</CardTitle>
          <CardDescription>Closing stops new signals, questions and chat. Rooms close with the session.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>Close session</AlertDialogTrigger>
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
        </CardContent>
      </Card>
    </div>
  );
}
