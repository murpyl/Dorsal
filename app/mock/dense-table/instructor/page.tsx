"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Sparkles } from "lucide-react";
import { ConceptGraph, LOW_SAMPLE, understandingScore, scoreColors } from "@/components/ConceptGraph";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LEVELS, PHASE_LABEL, type Phase } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { ACTIVITY, AI_RUN, CLUSTERS, CONCEPTS, EDGES, QUESTIONS, ROOMS, SESSION, conceptById, questionById, type Cluster, type Room } from "../fixtures";
import { Brand, MockBar } from "../parts";

const SHORTCUTS: { keys: string; what: string }[] = [
  { keys: "J / K", what: "Move the concept selection down / up" },
  { keys: "C", what: "Make the selected concept the current topic" },
  { keys: "R", what: "Open a help room on the selected concept" },
  { keys: "S", what: "Ask Claude to suggest clusters from pending questions" },
  { keys: "G", what: "Show / hide the concept graph" },
  { keys: "P", what: "Projector mode: big table, no raw questions" },
  { keys: "1 / 2", what: "Switch signal phase: before / after help" },
  { keys: "?", what: "This list" },
];

export default function InstructorDenseTable() {
  const [activeId, setActiveId] = useState(SESSION.activeConceptId);
  const [selectedId, setSelectedId] = useState(SESSION.activeConceptId);
  const [phase, setPhase] = useState<Phase>(SESSION.phase);
  const [showGraph, setShowGraph] = useState(false);
  const [projector, setProjector] = useState(false);
  const [help, setHelp] = useState(false);
  const [clusters, setClusters] = useState<Cluster[]>(CLUSTERS);
  const [rooms, setRooms] = useState<Room[]>(ROOMS);
  const [hidden, setHidden] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>("c3");
  const [editing, setEditing] = useState<string | null>(null);
  const [aiState, setAiState] = useState<"idle" | "running">("idle");
  const [activity, setActivity] = useState(ACTIVITY);
  const [copied, setCopied] = useState(false);

  const selected = conceptById(selectedId);
  const tallyFor = (c: (typeof CONCEPTS)[number]) => (phase === "pre" ? c : c.post);
  const responses = CONCEPTS.reduce((s, c) => s + tallyFor(c).total, 0);
  const confused = CONCEPTS.reduce((s, c) => s + tallyFor(c).counts.confused, 0);
  const published = clusters.filter((c) => c.status === "published");
  const suggested = clusters.filter((c) => c.status === "suggested");
  const pending = QUESTIONS.filter((q) => q.state === "pending" && !hidden.includes(q._id));
  const openClusterCount = (id: string) => published.filter((c) => c.conceptIds.includes(id)).length;
  const graphConcepts = CONCEPTS.map((c) => ({ ...c, ...tallyFor(c), openClusters: openClusterCount(c._id) }));

  function log(text: string, kind: (typeof ACTIVITY)[number]["kind"]) {
    setActivity((a) => [{ at: SESSION.now, text, kind }, ...a].slice(0, 8));
  }
  function makeCurrent(id: string) {
    setActiveId(id);
    log(`Current topic → ${conceptById(id).label}`, "topic");
  }
  function openRoom(conceptId: string, clusterId: string | null) {
    const c = conceptById(conceptId);
    const title = clusterId ? clusters.find((k) => k._id === clusterId)!.title : c.label;
    setRooms((r) => [
      ...r,
      { _id: `r${r.length + 1}`, title, conceptId, clusterId, capacity: 6, memberCount: 0, helperCount: 0, status: "open", isMember: false, myRole: null, openedAt: SESSION.now },
    ]);
    log(`Room “${title}” opened by you`, "room");
  }
  function publish(id: string) {
    setClusters((cs) => cs.map((c) => (c._id === id ? { ...c, status: "published", publishedAt: SESSION.now } : c)));
    log(`Published “${clusters.find((c) => c._id === id)!.title}”`, "cluster");
  }
  function discard(id: string) {
    setClusters((cs) => cs.filter((c) => c._id !== id));
  }
  function unpublish(id: string) {
    setClusters((cs) => cs.map((c) => (c._id === id ? { ...c, status: "suggested", publishedAt: null } : c)));
    log(`Unpublished “${clusters.find((c) => c._id === id)!.title}” — back to suggested`, "cluster");
  }
  function suggest() {
    if (aiState === "running" || pending.length === 0) return;
    setAiState("running");
    setTimeout(() => {
      setAiState("idle");
      log(`Claude suggested 1 cluster from ${pending.length} pending questions`, "cluster");
    }, 1500);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const i = CONCEPTS.findIndex((c) => c._id === selectedId);
      switch (e.key) {
        case "j":
        case "ArrowDown":
          setSelectedId(CONCEPTS[Math.min(i + 1, CONCEPTS.length - 1)]._id);
          break;
        case "k":
        case "ArrowUp":
          setSelectedId(CONCEPTS[Math.max(i - 1, 0)]._id);
          break;
        case "c":
          makeCurrent(selectedId);
          break;
        case "r":
          openRoom(selectedId, null);
          break;
        case "s":
          suggest();
          break;
        case "g":
          setShowGraph((v) => !v);
          break;
        case "p":
          setProjector((v) => !v);
          break;
        case "1":
          setPhase("pre");
          break;
        case "2":
          setPhase("post");
          break;
        case "?":
          setHelp((v) => !v);
          break;
        default:
          return;
      }
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className={cn("flex min-h-screen flex-col", projector && "text-[17px]")}>
      <MockBar screen="instructor" viewport="1440 × 900" />
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2">
          <Brand />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">{SESSION.title}</h1>
            <p className="text-xs text-muted-foreground">
              Instructor · started {SESSION.startedAt} · <span className="text-foreground">{PHASE_LABEL[phase]}</span>
            </p>
          </div>
          <dl className="ml-2 flex items-center gap-4 text-sm tabular-nums">
            <Stat label="participants" value={SESSION.participantCount} />
            <Stat label="responses" value={responses} />
            <Stat label="confused" value={confused} tone="warn" />
            <Stat label="published" value={published.length} />
            <Stat label="rooms" value={rooms.filter((r) => r.status === "open").length} />
          </dl>
          <div className="ml-auto flex items-center gap-2">
            <ToggleGroup aria-label="Signal phase" variant="outline" spacing={0} value={[phase]} onValueChange={(v) => v[0] && setPhase(v[0] as Phase)}>
              <ToggleGroupItem value="pre" size="sm" className="bg-background data-pressed:bg-primary data-pressed:text-primary-foreground">
                Before help <Kbd className="ml-1">1</Kbd>
              </ToggleGroupItem>
              <ToggleGroupItem value="post" size="sm" className="bg-background data-pressed:bg-primary data-pressed:text-primary-foreground">
                After help <Kbd className="ml-1">2</Kbd>
              </ToggleGroupItem>
            </ToggleGroup>
            <Button variant={showGraph ? "secondary" : "outline"} size="sm" aria-pressed={showGraph} onClick={() => setShowGraph((v) => !v)}>
              Graph <Kbd>G</Kbd>
            </Button>
            <Button variant={projector ? "secondary" : "outline"} size="sm" aria-pressed={projector} onClick={() => setProjector((v) => !v)}>
              Projector <Kbd>P</Kbd>
            </Button>
            <Dialog open={help} onOpenChange={setHelp}>
              <Button variant="outline" size="icon-sm" aria-label="Keyboard shortcuts" onClick={() => setHelp(true)}>
                ?
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Keyboard shortcuts</DialogTitle>
                  <DialogDescription>Work the whole dashboard without leaving the table.</DialogDescription>
                </DialogHeader>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  {SHORTCUTS.map((s) => (
                    <div key={s.keys} className="contents">
                      <dt>
                        <Kbd>{s.keys}</Kbd>
                      </dt>
                      <dd className="text-muted-foreground">{s.what}</dd>
                    </div>
                  ))}
                </dl>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>Close session</AlertDialogTrigger>
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
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1">
              <div className="text-right leading-none">
                <p className="text-[10px] text-muted-foreground">join at /join/{SESSION.code}</p>
                <p className={cn("font-mono font-bold tracking-[0.2em]", projector ? "text-3xl" : "text-xl")}>{SESSION.code}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={copied ? "Link copied" : "Copy join link"}
                onClick={() => {
                  navigator.clipboard
                    .writeText(`${window.location.origin}/join/${SESSION.code}`)
                    .then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    })
                    .catch(() => log("Could not copy the join link — copy the code by hand", "signal"));
                }}
              >
                {copied ? <Check className="text-teal-700" aria-hidden /> : <Copy aria-hidden />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className={cn("grid flex-1 gap-4 px-5 py-4 pb-10", !projector && "xl:grid-cols-[1fr_22rem]")}>
        <div className="min-w-0 space-y-5">
          {showGraph && (
            <ConceptGraph concepts={graphConcepts} edges={EDGES} activeConceptId={activeId} selectedId={selectedId} onSelect={setSelectedId} />
          )}

          <section aria-labelledby="concepts-heading" id="per-concept" className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="concepts-heading" className="font-heading text-sm font-semibold">
                  Concepts · {PHASE_LABEL[phase]}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Self-reported understanding, one row per concept. Counts are the text alternative to the graph colours; dashed N = fewer than {LOW_SAMPLE}{" "}
                  responses.
                </p>
              </div>
              <Legend />
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table className={cn(projector && "text-[17px]")}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8" />
                    <TableHead>Concept</TableHead>
                    <TableHead className="w-16 text-right">N</TableHead>
                    <TableHead className="w-[32%]">Distribution</TableHead>
                    <TableHead className="w-28 text-right">Confused · Partly · Can</TableHead>
                    <TableHead className="w-20 text-right">Clusters</TableHead>
                    {!projector && <TableHead className="w-56 text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CONCEPTS.map((c, i) => {
                    const isActive = c._id === activeId;
                    const isSelected = c._id === selectedId;
                    const tally = tallyFor(c);
                    const score = understandingScore(tally);
                    const low = tally.total < LOW_SAMPLE;
                    const n = openClusterCount(c._id);
                    return (
                      <TableRow
                        key={c._id}
                        data-state={isSelected ? "selected" : undefined}
                        aria-selected={isSelected}
                        tabIndex={0}
                        onClick={() => setSelectedId(c._id)}
                        onFocus={() => setSelectedId(c._id)}
                        className={cn("cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset", isActive && "bg-accent/50")}
                      >
                        <TableCell className="pl-3 text-xs tabular-nums text-muted-foreground">
                          <span className="inline-block w-1.5 rounded-full align-middle" style={{ background: scoreColors(score).accent, height: projector ? 28 : 20 }} aria-hidden />
                          <span className="sr-only">{i + 1}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn("font-medium", isActive && "font-semibold")}>{c.label}</span>
                            {isActive && <Badge>current</Badge>}
                          </div>
                          {!projector && <p className="max-w-xs truncate text-xs text-muted-foreground">{c.description}</p>}
                        </TableCell>
                        <TableCell className={cn("text-right tabular-nums", low && "text-amber-700")}>
                          {tally.total}
                          {low && <span className="sr-only"> (low sample)</span>}
                        </TableCell>
                        <TableCell>
                          <div role="img" aria-label={LEVELS.map((l) => `${l.label} ${tally.counts[l.value]}`).join(", ")}>
                            <DistributionBar tally={tally} className={cn(projector ? "h-4" : "h-2.5", low && "outline-2 outline-dashed outline-amber-500/60")} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {LEVELS.map((l, j) => (
                            <span key={l.value}>
                              {j > 0 && <span className="text-muted-foreground"> · </span>}
                              <span className={cn("font-medium", projector && "text-base")}>{tally.counts[l.value]}</span>
                            </span>
                          ))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {n > 0 ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                              {n}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">–</span>
                          )}
                        </TableCell>
                        {!projector && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button size="xs" variant={isActive ? "ghost" : "outline"} disabled={isActive} onClick={() => makeCurrent(c._id)}>
                                {isActive ? "Current" : "Make current"} {isSelected && !isActive && <Kbd>C</Kbd>}
                              </Button>
                              <Button size="xs" variant="outline" onClick={() => openRoom(c._id, null)}>
                                Open room {isSelected && <Kbd>R</Kbd>}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>

          {!projector && (
            <>
              <section aria-labelledby="clusters-heading" className="space-y-2">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 id="clusters-heading" className="font-heading text-sm font-semibold">
                      Questions &amp; clusters
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {suggested.length} suggested · {published.length} published · {pending.length} pending questions. Students only see published rows.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground" aria-live="polite">
                      {aiState === "running" ? (
                        <span className="text-foreground">Claude is grouping {pending.length} pending questions…</span>
                      ) : (
                        <>
                          Last run {AI_RUN.at} · {AI_RUN.model} · {(AI_RUN.latencyMs / 1000).toFixed(1)} s
                        </>
                      )}
                    </p>
                    <Button size="sm" onClick={suggest} disabled={aiState === "running" || pending.length === 0}>
                      <Sparkles data-icon="inline-start" aria-hidden />
                      Suggest clusters <Kbd>S</Kbd>
                    </Button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10" />
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead>Cluster</TableHead>
                        <TableHead className="w-44">Concepts</TableHead>
                        <TableHead className="w-12 text-right">Qs</TableHead>
                        <TableHead className="w-20 text-right">Helpers</TableHead>
                        <TableHead className="w-24 text-right">Model conf.</TableHead>
                        <TableHead className="w-60 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...suggested, ...published].map((c) => {
                        const isOpen = expanded === c._id;
                        const clusterRooms = rooms.filter((r) => r.clusterId === c._id);
                        return (
                          <ClusterRows
                            key={c._id}
                            cluster={c}
                            open={isOpen}
                            editing={editing === c._id}
                            rooms={clusterRooms}
                            onToggle={() => setExpanded(isOpen ? null : c._id)}
                            onEdit={() => {
                              setEditing(c._id);
                              setExpanded(c._id);
                            }}
                            onSave={(patch) => {
                              setClusters((cs) => cs.map((k) => (k._id === c._id ? { ...k, ...patch } : k)));
                              setEditing(null);
                            }}
                            onCancel={() => setEditing(null)}
                            onPublish={() => publish(c._id)}
                            onDiscard={() => discard(c._id)}
                            onUnpublish={() => unpublish(c._id)}
                            onOpenRoom={() => openRoom(c.conceptIds[0], c._id)}
                          />
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                    <h3 className="text-sm font-medium">
                      Pending questions <span className="tabular-nums text-muted-foreground">({pending.length})</span>
                      <span className="ml-2 text-xs font-normal text-muted-foreground">raw text · instructor only · never projected</span>
                    </h3>
                    <Button size="xs" variant="outline" disabled={picked.length === 0}>
                      Group selected ({picked.length}) into a cluster
                    </Button>
                  </div>
                  <Table>
                    <TableBody>
                      {pending.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                            No pending questions.
                          </TableCell>
                        </TableRow>
                      )}
                      {pending.map((q) => {
                        const checked = picked.includes(q._id);
                        return (
                          <TableRow key={q._id} className={cn(checked && "bg-muted/60")}>
                            <TableCell className="w-10 pl-3">
                              <Checkbox
                                aria-label="Select question for manual grouping"
                                checked={checked}
                                onCheckedChange={(v) => setPicked((p) => (v === true ? [...p, q._id] : p.filter((id) => id !== q._id)))}
                              />
                            </TableCell>
                            <TableCell className="whitespace-normal">{q.content}</TableCell>
                            <TableCell className="w-40">
                              <Badge variant="secondary">{conceptById(q.conceptId).label}</Badge>
                            </TableCell>
                            <TableCell className="w-32 text-xs text-muted-foreground">
                              {q.alias} · <span className="tabular-nums">{q.at}</span>
                            </TableCell>
                            <TableCell className="w-16 text-right">
                              <Button size="xs" variant="ghost" onClick={() => setHidden((h) => [...h, q._id])}>
                                Hide
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </section>

              <section aria-labelledby="rooms-heading" className="space-y-2">
                <h2 id="rooms-heading" className="font-heading text-sm font-semibold">
                  Help rooms <span className="font-sans text-xs font-normal text-muted-foreground">· max 6 per room · students join by choice</span>
                </h2>
                <div className="overflow-hidden rounded-xl border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-3">Room</TableHead>
                        <TableHead>Concept</TableHead>
                        <TableHead>From cluster</TableHead>
                        <TableHead className="w-28 text-right">Members</TableHead>
                        <TableHead className="w-20 text-right">Helpers</TableHead>
                        <TableHead className="w-20">Opened</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rooms.map((r) => (
                        <TableRow key={r._id} className={cn(r.status === "closed" && "text-muted-foreground")}>
                          <TableCell className="pl-3 font-medium">
                            {r.title}
                            {r.status === "closed" && (
                              <Badge variant="secondary" className="ml-2">
                                closed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{conceptById(r.conceptId).label}</TableCell>
                          <TableCell className="text-muted-foreground">{r.clusterId ? clusters.find((c) => c._id === r.clusterId)?.title ?? "–" : "–"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {r.memberCount} / {r.capacity}
                            {r.memberCount >= r.capacity - 1 && r.status === "open" && (
                              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-900">
                                {r.memberCount >= r.capacity ? "full" : "1 seat"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{r.helperCount}</TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">{r.openedAt}</TableCell>
                          <TableCell className="text-right">
                            {r.status === "open" && (
                              <Button size="xs" variant="ghost" onClick={() => setRooms((rs) => rs.map((x) => (x._id === r._id ? { ...x, status: "closed" } : x)))}>
                                Close
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </>
          )}
        </div>

        {!projector && (
          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <section aria-label="Selected concept" className="rounded-xl border bg-card">
              <div className="space-y-1 border-b p-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-base font-semibold">{selected.label}</h2>
                  {selected._id === activeId && <Badge>current</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{selected.description}</p>
              </div>
              <div className="space-y-3 p-4">
                {(["pre", "post"] as const).map((p) => {
                  const t = p === "pre" ? selected : selected.post;
                  return (
                    <div key={p} className="space-y-1">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className={cn("font-medium", p === phase ? "text-foreground" : "text-muted-foreground")}>{PHASE_LABEL[p]}</span>
                        <span className="tabular-nums text-muted-foreground">
                          N = {t.total}
                          {t.total === 0 ? " · none yet" : t.total < LOW_SAMPLE ? " · low" : ""}
                        </span>
                      </div>
                      <DistributionBar tally={t} />
                      <ul className="grid grid-cols-3 gap-1 text-xs tabular-nums">
                        {LEVELS.map((l) => (
                          <li key={l.value} className="flex items-center gap-1.5">
                            <span className={cn("size-2 rounded-full", l.dot)} aria-hidden />
                            <strong>{t.counts[l.value]}</strong>
                            <span className="text-muted-foreground">{t.total ? `${Math.round((t.counts[l.value] / t.total) * 100)}%` : "–"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                <p className="text-[11px] text-muted-foreground">Phases are separate response sets. A shift measures what students say, not verified learning.</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button disabled={selected._id === activeId} onClick={() => makeCurrent(selected._id)}>
                    {selected._id === activeId ? "Current topic" : "Make current"} <Kbd>C</Kbd>
                  </Button>
                  <Button variant="outline" onClick={() => openRoom(selected._id, null)}>
                    Open room <Kbd>R</Kbd>
                  </Button>
                </div>
              </div>
              <div className="space-y-2 border-t p-4 text-sm">
                <h3 className="text-xs font-medium text-muted-foreground uppercase">Published clusters here</h3>
                {published.filter((c) => c.conceptIds.includes(selected._id)).length === 0 ? (
                  <p className="text-xs text-muted-foreground">None yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {published
                      .filter((c) => c.conceptIds.includes(selected._id))
                      .map((c) => (
                        <li key={c._id}>
                          <button type="button" className="text-left font-medium underline-offset-2 hover:underline" onClick={() => setExpanded(c._id)}>
                            {c.title}
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            · {c.questionIds.length} questions · {c.helperCount} helpers
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </section>

            <section aria-labelledby="activity-heading" className="rounded-xl border bg-card p-4">
              <h2 id="activity-heading" className="flex items-center justify-between font-heading text-sm font-semibold">
                Activity
                <span className="text-xs font-normal text-muted-foreground">live</span>
              </h2>
              <ol className="mt-2 space-y-1.5 text-xs" aria-live="polite">
                {activity.map((a, i) => (
                  <li key={`${a.at}-${i}`} className="flex gap-2">
                    <span className="shrink-0 tabular-nums text-muted-foreground">{a.at}</span>
                    <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", a.kind === "cluster" ? "bg-amber-500" : a.kind === "room" ? "bg-teal-500" : a.kind === "topic" ? "bg-primary" : "bg-border")} aria-hidden />
                    <span className="min-w-0">{a.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className="flex items-baseline gap-1">
      <dd className={cn("text-lg font-semibold tracking-tight", tone === "warn" && value > 0 && "text-rose-600")}>{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

function ClusterRows({
  cluster: c,
  open,
  editing,
  rooms,
  onToggle,
  onEdit,
  onSave,
  onCancel,
  onPublish,
  onDiscard,
  onUnpublish,
  onOpenRoom,
}: {
  cluster: Cluster;
  open: boolean;
  editing: boolean;
  rooms: Room[];
  onToggle: () => void;
  onEdit: () => void;
  onSave: (patch: { title: string; summary: string; conceptIds: string[] }) => void;
  onCancel: () => void;
  onPublish: () => void;
  onDiscard: () => void;
  onUnpublish: () => void;
  onOpenRoom: () => void;
}) {
  const isSuggested = c.status === "suggested";
  return (
    <>
      <TableRow className={cn(isSuggested && "bg-amber-50/60")} aria-expanded={open}>
        <TableCell className="pl-3">
          <Button size="icon-xs" variant="ghost" aria-label={open ? "Collapse" : "Expand"} aria-expanded={open} onClick={onToggle}>
            {open ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
          </Button>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className={cn(isSuggested ? "bg-amber-100 text-amber-900" : "bg-teal-100 text-teal-900")}>
            {isSuggested ? "suggested" : "published"}
          </Badge>
        </TableCell>
        <TableCell className="whitespace-normal">
          <button type="button" className="text-left font-medium underline-offset-2 hover:underline" onClick={onToggle}>
            {c.title}
          </button>
          <p className="truncate text-xs text-muted-foreground">{c.summary}</p>
        </TableCell>
        <TableCell className="whitespace-normal">
          <div className="flex flex-wrap gap-1">
            {c.conceptIds.map((id) => (
              <Badge key={id} variant="outline">
                {conceptById(id).label}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell className="text-right tabular-nums">{c.questionIds.length}</TableCell>
        <TableCell className="text-right tabular-nums">{c.helperCount}</TableCell>
        <TableCell className="text-right text-xs tabular-nums text-muted-foreground" title="Model confidence, not calibrated">
          {Math.round(c.confidence * 100)}%
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            {isSuggested ? (
              <>
                <Button size="xs" onClick={onPublish}>
                  Publish
                </Button>
                <Button size="xs" variant="outline" onClick={onEdit}>
                  Edit
                </Button>
                <Button size="xs" variant="ghost" onClick={onDiscard}>
                  Discard
                </Button>
              </>
            ) : (
              <>
                <Button size="xs" variant="outline" onClick={onOpenRoom}>
                  Open room
                </Button>
                <Button size="xs" variant="outline" onClick={onEdit}>
                  Edit
                </Button>
                <Button size="xs" variant="ghost" onClick={onUnpublish}>
                  Unpublish
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell />
          <TableCell colSpan={7} className="whitespace-normal py-3">
            {editing ? (
              <ClusterEditForm cluster={c} onSave={onSave} onCancel={onCancel} />
            ) : (
              <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">
                    {c.questionIds.length} original questions · suggested by Claude
                  </p>
                  <ul className="space-y-1.5 border-l-2 pl-3 text-sm">
                    {c.questionIds.map((id) => {
                      const q = questionById(id);
                      return (
                        <li key={id}>
                          {q.content}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {q.alias} · {q.at}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="mb-1.5 font-medium uppercase">Rooms</p>
                  {rooms.length === 0 ? (
                    <p>No help room yet{isSuggested ? " (publish first)" : ""}.</p>
                  ) : (
                    <ul className="space-y-1">
                      {rooms.map((r) => (
                        <li key={r._id} className="text-foreground">
                          {r.title}{" "}
                          <span className="tabular-nums text-muted-foreground">
                            · {r.memberCount} / {r.capacity} · {r.helperCount} helper
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {c.publishedAt && <p className="mt-2">Published {c.publishedAt}</p>}
                </div>
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ClusterEditForm({
  cluster: c,
  onSave,
  onCancel,
}: {
  cluster: Cluster;
  onSave: (patch: { title: string; summary: string; conceptIds: string[] }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(c.title);
  const [summary, setSummary] = useState(c.summary);
  const [conceptIds, setConceptIds] = useState(c.conceptIds);
  return (
    <form
      className="max-w-2xl space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ title, summary, conceptIds });
      }}
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Cluster title" className="font-medium" />
      <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} rows={2} aria-label="Cluster summary" />
      <fieldset className="flex flex-wrap gap-1.5">
        <legend className="sr-only">Concepts</legend>
        {CONCEPTS.map((k) => {
          const on = conceptIds.includes(k._id);
          return (
            <label
              key={k._id}
              className={cn(
                "pressable flex cursor-pointer items-center rounded-full border px-2.5 py-1 text-xs font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                on ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-muted",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={(e) => setConceptIds(e.target.checked ? [...conceptIds, k._id] : conceptIds.filter((id) => id !== k._id))}
              />
              {k.label}
            </label>
          );
        })}
      </fieldset>
      <div className="flex gap-2">
        <Button size="sm" type="submit" disabled={!title.trim() || conceptIds.length === 0}>
          Save
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
