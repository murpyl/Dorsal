"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Check,
  Copy,
  DoorOpen,
  EyeOff,
  Inbox,
  MessageSquareText,
  Network,
  Radar,
  Sparkles,
  Users,
} from "lucide-react";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { LEVELS, PHASE_LABEL, type Phase } from "@/lib/levels";
import { cn } from "@/lib/utils";
import {
  type Concept,
  aiRun,
  type Cluster,
  clusters as fixtureClusters,
  concepts,
  edges,
  questions as fixtureQuestions,
  rooms as fixtureRooms,
  session,
  type Room,
} from "../fixtures";
import { Avatar, MockBanner, Toast, relTime, useToast } from "../ui";

type Section = "overview" | "graph" | "questions" | "rooms" | "results";
const NAV: { id: Section; label: string; icon: typeof Radar; hint: string }[] = [
  { id: "overview", label: "Overview", icon: Radar, hint: "Live radar" },
  { id: "graph", label: "Graph", icon: Network, hint: "Concept map" },
  { id: "questions", label: "Questions", icon: MessageSquareText, hint: "Queue & clusters" },
  { id: "rooms", label: "Rooms", icon: DoorOpen, hint: "Peer help" },
  { id: "results", label: "Results", icon: BarChart3, hint: "Before vs after" },
];

export default function InstructorMock() {
  const [section, setSection] = useState<Section>("overview");
  const [activeId, setActiveId] = useState(session.activeConceptId);
  const [selectedId, setSelectedId] = useState<string | null>(session.activeConceptId);
  const [phase, setPhase] = useState<Phase>(session.phase);
  const [clusters, setClusters] = useState<Cluster[]>(fixtureClusters);
  const [hidden, setHidden] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [rooms, setRooms] = useState<Room[]>(fixtureRooms);
  const [copied, setCopied] = useState(false);
  const [closed, setClosed] = useState(false);
  const [groupTitle, setGroupTitle] = useState<string | null>(null);
  const { toast, show, dismiss } = useToast();

  const active = concepts.find((c) => c._id === activeId)!;
  const selected = concepts.find((c) => c._id === selectedId) ?? null;
  const pending = fixtureQuestions.filter((q) => q.state === "pending" && !hidden.includes(q._id) && !clusters.some((c) => c.status === "published" && c.questionIds.includes(q._id)));
  const suggested = clusters.filter((c) => c.status === "suggested");
  const published = clusters.filter((c) => c.status === "published");
  const openRooms = rooms.filter((r) => r.status === "open");
  const tally = (c: Concept) => (phase === "post" ? c.post : c.counts);
  const responses = concepts.reduce((s, c) => s + tally(c).confused + tally(c).partial + tally(c).can_explain, 0);
  const confused = concepts.reduce((s, c) => s + tally(c).confused, 0);
  const graphConcepts = concepts.map((c) => ({ ...c, openClusters: published.filter((p) => p.conceptIds.includes(c._id)).length }));
  const counts: Partial<Record<Section, number>> = { questions: pending.length + suggested.length, rooms: openRooms.length };

  const makeCurrent = (id: string) => {
    setActiveId(id);
    show({ text: `“${concepts.find((c) => c._id === id)!.label}” is now the current topic for all students` });
  };
  const publish = (id: string) => {
    setClusters((cs) => cs.map((c) => (c._id === id ? { ...c, status: "published", publishedMinutesAgo: 0 } : c)));
    show({ text: "Cluster published — students see it under Help now", action: { label: "Open a room", onClick: () => setSection("rooms") } });
  };
  const discard = (id: string) => setClusters((cs) => cs.filter((c) => c._id !== id));
  const edit = (id: string, title: string, summary: string) => setClusters((cs) => cs.map((c) => (c._id === id ? { ...c, title, summary } : c)));
  const groupPicked = () => {
    const title = groupTitle?.trim();
    if (!title || picked.length === 0) return;
    const qs = fixtureQuestions.filter((q) => picked.includes(q._id));
    const conceptIds = Array.from(new Set(qs.map((q) => q.conceptId)));
    setClusters((cs) => [{ _id: `c${cs.length + 1}`, title, summary: qs[0].content, conceptIds, questionIds: picked, status: "suggested", source: "manual", confidence: null, helperCount: 0 }, ...cs]);
    setPicked([]);
    setGroupTitle(null);
    show({ text: `Grouped ${qs.length} questions as “${title}” — review and publish it` });
  };
  const openRoom = (conceptId: string, clusterId: string | null, title: string) => {
    setRooms((rs) => [{ _id: `r${rs.length + 1}`, title, conceptId, clusterId, capacity: 6, members: [], status: "open", openedMinutesAgo: 0 }, ...rs]);
    show({ text: `Room “${title}” opened · students can join from Help` });
    setSection("rooms");
  };

  return (
    <div className="flex min-h-screen w-full">
      <aside className="w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground" aria-label="Session">
        <div className="sticky top-0 flex h-screen flex-col">
        <div className="space-y-4 p-4">
          <Brand />
          <div className="rounded-xl border bg-card p-3">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Join code</p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className="font-mono text-3xl font-bold tracking-[0.2em]">{session.code}</p>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={copied ? "Link copied" : "Copy join link"}
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/join/${session.code}`).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                {copied ? <Check className="text-teal-700" aria-hidden /> : <Copy aria-hidden />}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">classpulse.app/join/{session.code}</p>
          </div>
          <div className="space-y-1.5 rounded-xl border bg-card p-3">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Signals</p>
            <p className="text-sm font-medium">{PHASE_LABEL[phase]}</p>
            <PhaseSwitch phase={phase} onSwitch={(p) => { setPhase(p); show({ text: `Signal phase is now “${PHASE_LABEL[p]}” — room check-ins record here` }); }} compact />
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-2" aria-label="Sections">
          {NAV.map((n) => {
            const on = section === n.id;
            const count = counts[n.id];
            return (
              <button
                key={n.id}
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => setSection(n.id)}
                className={cn(
                  "pressable flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  on ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <n.icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">
                  {n.label}
                  <span className={cn("block text-[11px] font-normal", on ? "text-sidebar-primary-foreground/75" : "text-muted-foreground")}>{n.hint}</span>
                </span>
                {count ? (
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", on ? "bg-sidebar-primary-foreground/20" : "bg-blahaj-pink/10 text-blahaj-pink")}>
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="space-y-3 border-t p-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-500/60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-teal-600" />
            </span>
            {closed ? "Closed" : "Live"} · {session.participantCount} in session · {session.startedMinutesAgo} min
          </p>
          <p className="flex items-start gap-1.5">
            <EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Projector-safe: Overview, Graph, Results. Questions shows raw student text.
          </p>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" className="w-full" disabled={closed} />}>{closed ? "Session closed" : "Close session"}</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Close this session?</AlertDialogTitle>
                <AlertDialogDescription>Students can no longer send signals or chat. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it open</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => { setClosed(true); show({ text: "Session closed — students can no longer send signals or chat" }); }}>Close session</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MockBanner screen="Instructor · 1440 px" />
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b bg-background/95 px-8 py-4 backdrop-blur-sm">
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">
              {session.course} · {session.title}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{NAV.find((n) => n.id === section)!.label}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {(section === "overview" || section === "graph") && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Current topic
                <Select items={concepts.map((c) => ({ value: c._id, label: c.label }))} value={activeId} onValueChange={(v) => v && makeCurrent(v)}>
                  <SelectTrigger aria-label="Current topic" className="min-w-52 bg-primary font-semibold text-primary-foreground [&_svg]:text-primary-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {concepts.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            )}
            {section === "questions" && (
              <Button size="lg" disabled={pending.length === 0} onClick={() => show({ text: "Claude is grouping 5 questions… suggestions appear below when ready" })}>
                <Sparkles data-icon="inline-start" aria-hidden />
                Suggest clusters ({pending.length} pending)
              </Button>
            )}
            {section === "rooms" && <OpenRoomDialog onOpen={openRoom} />}
            {section === "results" && <PhaseSwitch phase={phase} onSwitch={(p) => { setPhase(p); show({ text: `Signal phase is now “${PHASE_LABEL[p]}”` }); }} />}
          </div>
        </header>

        <main className="flex-1 space-y-6 px-8 py-6 pb-12">
          {section === "overview" && (
            <>
              <section className="grid grid-cols-4 gap-4" aria-label="Session metrics">
                <Metric i={0} label="Participants" value={session.participantCount} detail={`incl. ${session.simulatedCount} simulated`} />
                <Metric i={1} label="Responses" value={responses} detail={PHASE_LABEL[phase].toLowerCase()} />
                <Metric i={2} label="Confused responses" value={confused} detail={`of ${responses}`} tone="warn" />
                <Metric i={3} label="Published clusters" value={published.length} detail={`${suggested.length} awaiting review`} />
              </section>

              <section className="grid gap-4 lg:grid-cols-[1fr_22rem]" aria-label="Radar">
                <div className="space-y-4">
                  <Card className="border-2 border-primary/40">
                    <CardHeader>
                      <Badge className="mb-1 w-fit">Current topic</Badge>
                      <CardTitle className="text-xl" render={<h2 />}>{active.label}</CardTitle>
                      <CardDescription>{active.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="space-y-2">
                        <DistributionBar tally={active} className="h-4" />
                        <Legend />
                      </div>
                      <ul className="flex gap-6 text-sm">
                        {LEVELS.map((l) => (
                          <li key={l.value} className="text-center">
                            <p className="text-2xl font-semibold tabular-nums">{active.counts[l.value]}</p>
                            <p className="text-xs text-muted-foreground">{l.label}</p>
                          </li>
                        ))}
                        <li className="text-center">
                          <p className="text-2xl font-semibold tabular-nums">{active.total}</p>
                          <p className="text-xs text-muted-foreground">N</p>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  <ConceptGraph concepts={graphConcepts} edges={edges} activeConceptId={activeId} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setSection("graph"); }} />
                </div>
                <Card aria-labelledby="attention" className="h-fit">
                  <CardHeader>
                    <CardTitle id="attention" render={<h2 />}>Needs attention</CardTitle>
                    <CardDescription>What changed since you last looked. Each row jumps to its section.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <AttentionRow icon={Inbox} onClick={() => setSection("questions")} title={`${pending.length} new questions`} detail={`newest ${relTime(pending[pending.length - 1]?.minutesAgo ?? 0)} · ${pending.filter((q) => q.conceptId === "tree-recursion").length} about Tree recursion`} />
                    <AttentionRow icon={Sparkles} onClick={() => setSection("questions")} title={`${suggested.length} clusters to review`} detail={`Claude · ${relTime(aiRun.minutesAgo)} · ${(aiRun.latencyMs / 1000).toFixed(1)} s`} tone="warn" />
                    {openRooms.filter((r) => r.capacity - r.members.length <= 1).map((r) => (
                      <AttentionRow key={r._id} icon={Users} onClick={() => setSection("rooms")} title={`Room “${r.title}” is ${r.members.length >= r.capacity ? "full" : "nearly full"}`} detail={`${r.members.length} / ${r.capacity} · consider opening a second room`} />
                    ))}
                    {concepts.filter((c) => c.total < LOW_SAMPLE).map((c) => (
                      <AttentionRow key={c._id} icon={AlertTriangle} onClick={() => { setSelectedId(c._id); setSection("graph"); }} title={`${c.label}: low sample`} detail={`N = ${c.total} · colour is tentative`} />
                    ))}
                    {concepts.filter((c) => c.total >= LOW_SAMPLE && c.counts.confused / c.total >= 0.45).map((c) => (
                      <AttentionRow key={c._id} icon={AlertTriangle} onClick={() => { setSelectedId(c._id); setSection("graph"); }} title={`${c.label}: ${Math.round((c.counts.confused / c.total) * 100)}% confused`} detail={`${c.counts.confused} of ${c.total}${c._id === activeId ? " · current topic" : ""}`} tone="warn" />
                    ))}
                  </CardContent>
                </Card>
              </section>
            </>
          )}

          {section === "graph" && (
            <>
              <section className="grid gap-4 lg:grid-cols-[1fr_22rem]" aria-label="Concept graph and details">
                <ConceptGraph concepts={graphConcepts} edges={edges} activeConceptId={activeId} selectedId={selectedId} onSelect={setSelectedId} />
                <Card aria-label="Concept details" className="h-fit lg:sticky lg:top-24">
                  {selected ? (
                    <>
                      <CardHeader>
                        {selected._id === activeId && <Badge className="mb-1 w-fit">Current topic</Badge>}
                        <CardTitle className="text-lg" render={<h2 />}>{selected.label}</CardTitle>
                        <CardDescription>{selected.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <DistributionBar tally={selected} />
                          <ul className="space-y-1 text-sm">
                            {LEVELS.map((l) => (
                              <li key={l.value} className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2">
                                  <span className={`inline-block size-2 rounded-full ${l.dot}`} aria-hidden />
                                  {l.label}
                                </span>
                                <span className="tabular-nums">
                                  <strong>{selected.counts[l.value]}</strong>
                                  <span className="text-muted-foreground"> / {selected.total}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                          {selected.total < LOW_SAMPLE && <p className="text-sm text-amber-700">Low sample (N = {selected.total}); treat the colour as tentative.</p>}
                        </div>
                        {selected._id !== activeId && (
                          <Button className="w-full" onClick={() => makeCurrent(selected._id)}>
                            Make current topic
                          </Button>
                        )}
                        <Separator />
                        <div className="space-y-2 text-sm">
                          <h3 className="font-medium">Published question clusters</h3>
                          {published.filter((c) => c.conceptIds.includes(selected._id)).length === 0 ? (
                            <p className="text-muted-foreground">None published for this concept yet.</p>
                          ) : (
                            published
                              .filter((c) => c.conceptIds.includes(selected._id))
                              .map((c) => (
                                <div key={c._id} className="space-y-1">
                                  <p className="font-medium">{c.title}</p>
                                  <ul className="space-y-1 border-l-2 pl-3 text-muted-foreground">
                                    {c.questionIds.map((id) => (
                                      <li key={id}>{fixtureQuestions.find((q) => q._id === id)!.content}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))
                          )}
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => openRoom(selected._id, null, `${selected.label} walk-through`)}>
                          <DoorOpen data-icon="inline-start" aria-hidden />
                          Open a help room for this concept
                        </Button>
                      </CardContent>
                    </>
                  ) : (
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">Click a concept (or Tab to it and press Enter) to see its signal breakdown.</CardContent>
                  )}
                </Card>
              </section>
              <section className="space-y-3" id="per-concept" aria-labelledby="per-concept-heading">
                <div>
                  <h2 id="per-concept-heading" className="text-lg font-semibold tracking-tight">
                    Per-concept distribution
                  </h2>
                  <p className="text-sm text-muted-foreground">Text alternative to the graph colours. Self-reported understanding, not measured mastery.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {graphConcepts.map((c) => (
                    <Card key={c._id} size="sm" className={cn(c._id === activeId && "ring-2 ring-foreground/80")}>
                      <CardHeader>
                        <CardTitle className="flex flex-wrap items-center gap-2" render={<h3 />}>
                          {c.label}
                          {c._id === activeId && <Badge>current topic</Badge>}
                          {c.openClusters > 0 && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                              {c.openClusters} open cluster{c.openClusters === 1 ? "" : "s"}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="tabular-nums">
                          N = {c.total}
                          {c.total < LOW_SAMPLE && <span className="ml-2 text-amber-600">low sample</span>}
                          {understandingScore(c) !== null && <span className="ml-2">· understanding {Math.round(understandingScore(c)! * 100)}%</span>}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <DistributionBar tally={c} />
                        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {LEVELS.map((l) => (
                            <span key={l.value} className="flex items-center gap-1.5 tabular-nums">
                              <span className={`inline-block size-2 rounded-full ${l.dot}`} aria-hidden />
                              {l.label}: <strong className="text-foreground">{c.counts[l.value]}</strong> / {c.total}
                            </span>
                          ))}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </>
          )}

          {section === "questions" && (
            <section className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_1fr]" aria-label="Question queue and clusters">
              <div className="space-y-3">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Queue · {pending.length} pending</h2>
                    <p className="text-sm text-muted-foreground">
                      Raw student text · last Claude run {relTime(aiRun.minutesAgo)}, {aiRun.model}, {(aiRun.latencyMs / 1000).toFixed(1)} s, ok
                    </p>
                  </div>
                  <Button size="sm" variant="outline" disabled={picked.length === 0 || groupTitle !== null} onClick={() => setGroupTitle("")}>
                    Group {picked.length > 0 ? picked.length : ""} selected
                  </Button>
                </div>
                {groupTitle !== null && (
                  <form
                    className="enter flex items-end gap-2 rounded-xl border bg-card p-3"
                    onSubmit={(e) => { e.preventDefault(); groupPicked(); }}
                    aria-label="Group selected questions"
                  >
                    <label className="flex-1 space-y-1 text-sm">
                      <span className="font-medium">Cluster title for {picked.length} selected</span>
                      <Input autoFocus value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} maxLength={120} placeholder="e.g. Where does the return value go?" />
                    </label>
                    <Button type="submit" size="sm" disabled={!groupTitle.trim()}>Create cluster</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setGroupTitle(null)}>Cancel</Button>
                  </form>
                )}
                <ul className="space-y-2">
                  {pending.map((q, i) => {
                    const on = picked.includes(q._id);
                    return (
                      <li key={q._id}>
                        <label className={cn("enter flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50", on && "border-foreground/40 bg-accent/40")} style={{ "--i": i } as React.CSSProperties}>
                          <Checkbox checked={on} onCheckedChange={(v) => setPicked((p) => (v === true ? [...p, q._id] : p.filter((id) => id !== q._id)))} className="mt-0.5" />
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="block">{q.content}</span>
                            <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                              <Badge variant="secondary">{concepts.find((c) => c._id === q.conceptId)!.label}</Badge>
                              {q.alias} · {relTime(q.minutesAgo)}
                              {q.isSimulated && <Badge variant="outline">simulated</Badge>}
                            </span>
                          </span>
                          <Button size="icon-xs" variant="ghost" aria-label="Hide question" onClick={(e) => { e.preventDefault(); setHidden((h) => [...h, q._id]); }}>
                            <EyeOff aria-hidden />
                          </Button>
                        </label>
                      </li>
                    );
                  })}
                  {pending.length === 0 && <li className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Queue is empty.</li>}
                </ul>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Suggested by Claude · {suggested.length}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">review before publishing</span>
                  </h2>
                  <div className="grid gap-3 2xl:grid-cols-2">
                    {suggested.map((c, i) => (
                      <ClusterCard key={c._id} i={i} cluster={c} onEdit={edit} actions={
                        <>
                          <Button size="sm" onClick={() => publish(c._id)}>Publish</Button>
                          <Button size="sm" variant="ghost" onClick={() => discard(c._id)}>Discard</Button>
                        </>
                      } />
                    ))}
                    {suggested.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nothing waiting for review.</p>}
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Published · {published.length}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">students see these under Help</span>
                  </h2>
                  <div className="grid gap-3 2xl:grid-cols-2">
                    {published.map((c, i) => {
                      const room = rooms.find((r) => r.clusterId === c._id && r.status === "open");
                      return (
                        <ClusterCard key={c._id} i={i} cluster={c} onEdit={edit} footer={
                          room ? (
                            <p className="text-xs text-muted-foreground">
                              Room <span className="font-medium text-foreground">{room.title}</span> · <span className="tabular-nums">{room.members.length} / {room.capacity}</span>
                              {room.members.length >= room.capacity - 1 && <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-900">nearly full</Badge>}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">{c.helperCount} helper{c.helperCount === 1 ? "" : "s"} opted in · no room yet</p>
                          )
                        } actions={
                          <Button size="sm" variant={room ? "outline" : "default"} onClick={() => openRoom(c.conceptIds[0], c._id, c.title)}>
                            <DoorOpen data-icon="inline-start" aria-hidden />
                            {room ? "Open another room" : "Open a help room"}
                          </Button>
                        } />
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {section === "rooms" && (
            <section className="space-y-4" aria-label="Help rooms">
              <p className="text-sm text-muted-foreground">
                {openRooms.length} open · capacity 6 each · helpers volunteered themselves; it is not a verified credential.
              </p>
              <div className="overflow-hidden rounded-xl border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Room</th>
                      <th className="px-4 py-2.5 font-medium">Concept</th>
                      <th className="px-4 py-2.5 font-medium">Members</th>
                      <th className="px-4 py-2.5 font-medium">Capacity</th>
                      <th className="px-4 py-2.5 font-medium">Opened</th>
                      <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r) => {
                      const helpers = r.members.filter((m) => m.role === "helper").length;
                      return (
                        <tr key={r._id} className={cn("border-t", r.status === "closed" && "text-muted-foreground")}>
                          <td className="px-4 py-3">
                            <p className="font-medium">{r.title}</p>
                            <p className="text-xs text-muted-foreground">{r.clusterId ? `for cluster “${clusters.find((c) => c._id === r.clusterId)?.title}”` : "opened from the graph"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{concepts.find((c) => c._id === r.conceptId)!.label}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="flex -space-x-2">
                                {r.members.map((m) => (
                                  <Avatar key={m.alias} alias={m.alias} size="sm" className={cn(m.role === "helper" && "ring-2 ring-teal-500")} />
                                ))}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {r.members.length === 0 ? "empty" : `${helpers} helper${helpers === 1 ? "" : "s"}, ${r.members.length - helpers} learner${r.members.length - helpers === 1 ? "" : "s"}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-20 overflow-hidden rounded-full bg-muted" aria-hidden>
                                <span className={cn("block h-full rounded-full", r.members.length >= r.capacity ? "bg-blahaj-pink" : r.members.length >= r.capacity - 1 ? "bg-amber-400" : "bg-teal-500")} style={{ width: `${(r.members.length / r.capacity) * 100}%` }} />
                              </span>
                              <span className="tabular-nums">{r.members.length} / {r.capacity}</span>
                              {r.members.length >= r.capacity - 1 && r.status === "open" && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-900">{r.members.length >= r.capacity ? "full" : "nearly full"}</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{relTime(r.openedMinutesAgo)}</td>
                          <td className="px-4 py-3 text-right">
                            {r.status === "open" ? (
                              <AlertDialog>
                                <AlertDialogTrigger render={<Button size="sm" variant="destructive" />}>Close</AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Close “{r.title}”?</AlertDialogTitle>
                                    <AlertDialogDescription>{r.members.length} member{r.members.length === 1 ? "" : "s"} will see the room as closed and can no longer chat. Their check-ins are kept.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Keep open</AlertDialogCancel>
                                    <AlertDialogAction variant="destructive" onClick={() => setRooms((rs) => rs.map((x) => (x._id === r._id ? { ...x, status: "closed" } : x)))}>Close room</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-900">closed</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {section === "results" && (
            <section className="grid gap-4 lg:grid-cols-[1fr_20rem]" aria-label="Before vs after">
              <Card>
                <CardHeader>
                  <CardTitle render={<h2 />}>Before vs after peer help</CardTitle>
                  <CardDescription>
                    Self-reported understanding per phase. Each bar shows its own N; the two phases are separate response sets. A shift here measures what students <em>say</em>, not verified learning gains.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ul className="space-y-4">
                    {concepts.map((c) => {
                      const post = { counts: c.post, total: c.post.confused + c.post.partial + c.post.can_explain };
                      return (
                        <li key={c._id} className="space-y-1.5">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            {c.label}
                            {c._id === activeId && <Badge>current topic</Badge>}
                          </p>
                          <PhaseRow phase="pre" tally={c} />
                          <PhaseRow phase="post" tally={post} />
                        </li>
                      );
                    })}
                  </ul>
                  <Legend />
                </CardContent>
              </Card>
              <div className="space-y-4">
                <Card size="sm">
                  <CardHeader>
                    <CardTitle render={<h2 />}>How to read this</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>“After help” fills in as students check in from a room while the phase is set to after help.</p>
                    <p>Only Call stack has a post sample so far (N = 18, from the “Tracing recursive return values” room). Low-N rows are marked.</p>
                    <p>Switching the phase is the one action on this page; it affects every new signal, so it asks for confirmation.</p>
                  </CardContent>
                </Card>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle render={<h2 />}>Session</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <p>{session.participantCount} participants ({session.simulatedCount} simulated)</p>
                    <p>{responses} signals · {published.length} published clusters · {rooms.length} rooms</p>
                    <p>Started {session.startedMinutesAgo} min ago</p>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}
        </main>
      </div>
      <Toast toast={toast} onDismiss={dismiss} className="bottom-6" />
    </div>
  );
}

function PhaseSwitch({ phase, onSwitch, compact }: { phase: Phase; onSwitch: (p: Phase) => void; compact?: boolean }) {
  const next: Phase = phase === "pre" ? "post" : "pre";
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant={compact ? "outline" : "default"} size={compact ? "sm" : "lg"} className={cn(compact && "w-full")} />}>
        Switch to {PHASE_LABEL[next].toLowerCase()}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Switch signals to “{PHASE_LABEL[next]}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Every new confidence signal and room check-in is recorded under the {next === "post" ? "after-help" : "before-help"} phase from now on. Existing responses are kept. You can switch back.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction onClick={() => onSwitch(next)}>Switch phase</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function OpenRoomDialog({ onOpen }: { onOpen: (conceptId: string, clusterId: string | null, title: string) => void }) {
  const [conceptId, setConceptId] = useState(session.activeConceptId);
  const label = concepts.find((c) => c._id === conceptId)!.label;
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="lg" />}>
        <DoorOpen data-icon="inline-start" aria-hidden />
        Open a room
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Open a help room</AlertDialogTitle>
          <AlertDialogDescription>Students see it under Help and can join until it has 6 members. Helpers who opted in for the concept are listed first.</AlertDialogDescription>
        </AlertDialogHeader>
        <label className="flex items-center gap-2 text-sm">
          Concept
          <Select items={concepts.map((c) => ({ value: c._id, label: c.label }))} value={conceptId} onValueChange={(v) => v && setConceptId(v)}>
            <SelectTrigger className="flex-1" aria-label="Room concept">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {concepts.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onOpen(conceptId, null, `${label} walk-through`)}>Open room</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ClusterCard({ i, cluster, actions, footer, onEdit }: { i: number; cluster: Cluster; actions: React.ReactNode; footer?: React.ReactNode; onEdit: (id: string, title: string, summary: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(cluster.title);
  const [summary, setSummary] = useState(cluster.summary);
  const save = () => { onEdit(cluster._id, title.trim(), summary.trim()); setEditing(false); };
  return (
    <Card className="enter" style={{ "--i": i } as React.CSSProperties}>
      {editing ? (
        <CardContent className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Cluster title" className="font-medium" />
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} rows={2} aria-label="Cluster summary" />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={!title.trim()}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setTitle(cluster.title); setSummary(cluster.summary); setEditing(false); }}>Cancel</Button>
          </div>
        </CardContent>
      ) : (
        <CardHeader>
          <CardTitle render={<h3 />}>{cluster.title}</CardTitle>
          <CardDescription>{cluster.summary}</CardDescription>
          <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
            <Button size="xs" variant="ghost" onClick={() => { setTitle(cluster.title); setSummary(cluster.summary); setEditing(true); }}>Edit</Button>
          </div>
          <p className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
            {cluster.conceptIds.map((id) => (
              <Badge key={id} variant="secondary">{concepts.find((c) => c._id === id)!.label}</Badge>
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
            <span className="mr-1 inline-block transition-transform duration-150 ease-out group-open/details:rotate-90" aria-hidden>›</span>
            {cluster.questionIds.length} original questions
          </summary>
          <ul className="mt-2 space-y-1.5 border-l-2 pl-3 text-sm">
            {cluster.questionIds.map((id) => {
              const q = fixtureQuestions.find((x) => x._id === id)!;
              return (
                <li key={id} className="break-words">
                  {q.content}
                  {q.isSimulated && <Badge variant="outline" className="ml-2">simulated</Badge>}
                </li>
              );
            })}
          </ul>
        </details>
      </CardContent>
      <CardFooter className="gap-2">{actions}</CardFooter>
    </Card>
  );
}

function PhaseRow({ phase, tally }: { phase: Phase; tally: { counts: Record<string, number>; total: number } }) {
  return (
    <div className="grid grid-cols-[3rem_1fr_7rem] items-center gap-2 text-xs">
      <span className="font-mono uppercase text-muted-foreground">{phase}</span>
      <DistributionBar tally={tally as never} />
      <span className="tabular-nums text-muted-foreground">
        N = {tally.total}
        {tally.total === 0 ? <span className="ml-1 text-muted-foreground/60">none</span> : tally.total < LOW_SAMPLE && <span className="ml-1 text-amber-600">low</span>}
      </span>
    </div>
  );
}

function AttentionRow({ icon: Icon, title, detail, onClick, tone }: { icon: typeof Inbox; title: string; detail: string; onClick: () => void; tone?: "warn" }) {
  return (
    <button type="button" onClick={onClick} className="pressable flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
      <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", tone === "warn" ? "bg-amber-100 text-amber-800" : "bg-accent text-foreground")}>
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}

function Metric({ i, label, value, detail, tone }: { i: number; label: string; value: number; detail?: string; tone?: "warn" }) {
  return (
    <Card size="sm" className="enter" style={{ "--i": i } as React.CSSProperties}>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className={cn("text-3xl font-semibold tracking-tight tabular-nums", tone === "warn" && "text-blahaj-pink")}>{value}</span>
          {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
        </p>
      </CardContent>
    </Card>
  );
}
