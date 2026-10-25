"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Check, Copy, Megaphone, MousePointerClick, UserPlus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Brand } from "@/components/Brand";
import { ClusterQueue, ConceptClusters } from "@/components/ClusterQueue";
import { ConceptGraph, LOW_SAMPLE } from "@/components/ConceptGraph";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InlineError } from "@/components/InlineError";
import { PageSkeleton } from "@/components/PageSkeleton";
import { DistributionBar, PrePostComparison, SessionControls } from "@/components/PrePostComparison";
import { RoomStatus } from "@/components/RoomList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { errorMessage } from "@/lib/errors";
import { instructorSecretKey, newSecret, taSecretKey, useStoredCredential } from "@/lib/credentials";
import { LEVELS } from "@/lib/levels";
import { MAX_PROMPT_LENGTH } from "@/lib/prompt";
import { TA_NAME_MAX } from "@/lib/staff";
import { cn } from "@/lib/utils";

type DashTab = "concept" | "questions" | "rooms" | "results" | "staff";

export function RadarDashboard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  // A TA link opened on this device takes over (even where the instructor's secret is also stored), so a revoked TA is locked out.
  const instructorSecret = useStoredCredential(instructorSecretKey(sessionId), false);
  const taSecret = useStoredCredential(taSecretKey(sessionId), false);
  const secret = instructorSecret === undefined || taSecret === undefined ? undefined : (taSecret ?? instructorSecret);
  const view = useQuery(
    api.sessions.getInstructorView,
    secret ? { sessionId, instructorSecret: secret } : "skip",
  );
  const setActiveConcept = useMutation(api.sessions.setActiveConcept);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DashTab>("concept");

  if (secret === null || view === null)
    return (
      <main className="mx-auto w-full max-w-xl p-8">
        <InlineError message={taSecret ? "Your TA access to this session was revoked." : "No instructor access for this session on this device."} />
        {taSecret && instructorSecret && (
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              localStorage.removeItem(taSecretKey(sessionId));
              window.location.reload();
            }}
          >
            Use instructor access on this device
          </Button>
        )}
      </main>
    );
  if (view === undefined) return <PageSkeleton wide />;

  const responses = view.concepts.reduce((sum, c) => sum + c.total, 0);
  const confused = view.concepts.reduce((sum, c) => sum + c.counts.confused, 0);
  const selected = view.concepts.find((c) => c._id === selectedId) ?? null;
  const participation = view.participantCount > 0 ? Math.round((view.answeredCount / view.participantCount) * 100) : 0;
  const coverage = (id: string) =>
    id === view.activeConceptId ? "current" : view.coveredConceptIds.includes(id as Id<"concepts">) ? "covered" : "upcoming";

  async function makeCurrent(conceptId: Id<"concepts">, question?: string) {
    setError(null);
    try {
      await setActiveConcept({ sessionId: sessionId as Id<"sessions">, instructorSecret: secret!, conceptId, question });
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  }

  return (
    <main className="flex w-full flex-col gap-3 px-3 py-3 md:px-5 lg:h-dvh lg:overflow-hidden">
      <header className="enter flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Brand />
          <div>
            <p className="text-sm text-muted-foreground">{view.role === "ta" ? `TA · ${view.taName}` : "Instructor"}</p>
            <h1 className="truncate text-xl font-semibold tracking-tight">{view.title}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JoinCode code={view.code} />
          <SessionControls sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} state={view.state} />
        </div>
      </header>
      <ConnectionStatus />
      <div className="grid shrink-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
      <PushPromptForm
        concepts={view.concepts}
        activeConceptId={view.activeConceptId}
        activePrompt={view.activePrompt}
        onPush={makeCurrent}
        error={error}
      />
        <section className="grid grid-cols-5 divide-x divide-border overflow-hidden rounded-full bg-card ring-1 ring-foreground/10" aria-label="Session metrics">
          <Stat label="Participants" value={view.participantCount} detail={view.simulatedCount > 0 ? `${view.simulatedCount} simulated` : undefined} />
          <Stat label="Answered now" value={`${view.answeredCount}/${view.participantCount}`} detail={`${participation}%`} />
          <Stat label="Responses" value={responses} />
          <Stat label="Confused" value={confused} detail={`of ${responses}`} tone={confused > 0 ? "warn" : undefined} />
          <Stat label="Open clusters" value={view.publishedClusterCount} />
        </section>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)]">
        <section className="flex min-h-0 flex-col gap-3" aria-label="Concept graph">
        <ConceptGraph
          concepts={view.concepts}
          edges={view.edges}
          activeConceptId={view.activeConceptId}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setTab("concept");
          }}
          className="min-h-72 flex-1"
        />
          <div className="max-h-56 shrink-0 overflow-y-auto px-1">
          <section className="space-y-3" id="per-concept" aria-labelledby="per-concept-heading">
            <div>
              <h2 id="per-concept-heading" className="text-lg font-semibold tracking-tight">
                Per-concept distribution
              </h2>
              <p className="text-sm text-muted-foreground">Text alternative to the graph colours.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
              {view.concepts.map((c) => {
                const active = c._id === view.activeConceptId;
                return (
                  <Card key={c._id} size="sm" className={cn(active && "ring-2 ring-foreground/80")}>
                    <CardHeader>
                      <CardTitle className="flex flex-wrap items-center gap-2" render={<h3 />}>
                        {c.label}
                        {active && <Badge>current topic</Badge>}
                        {coverage(c._id) === "covered" && (
                          <Badge variant="outline" className="font-normal text-muted-foreground">
                            covered · {c.total} answered
                          </Badge>
                        )}
                        {coverage(c._id) === "upcoming" && (
                          <Badge variant="ghost" className="font-normal text-muted-foreground/70">
                            not yet covered
                          </Badge>
                        )}
                        {c.openClusters > 0 && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                            {c.openClusters} open cluster{c.openClusters === 1 ? "" : "s"}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="tabular-nums">
                        N = {c.total}
                        {c.total < LOW_SAMPLE && <span className="ml-2 text-amber-600">{c.total === 0 ? "no responses" : "low sample"}</span>}
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
                );
              })}
            </div>
          </section>
          </div>
        </section>

        <Tabs value={tab} onValueChange={(v) => setTab(v as DashTab)} className="flex min-h-0 flex-col gap-2 rounded-xl bg-card p-2 ring-1 ring-foreground/10">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="concept">Concept</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="results">Before/after</TabsTrigger>
            {view.role === "instructor" && <TabsTrigger value="staff">TAs</TabsTrigger>}
          </TabsList>
          <TabsContent value="concept" className="min-h-0 overflow-y-auto">
          <Card aria-label="Concept details" className="ring-0">
            {selected ? (
              <>
                <CardHeader>
                  {selected._id === view.activeConceptId && <Badge className="mb-1 w-fit">Current topic</Badge>}
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
                    {selected.total < LOW_SAMPLE && (
                      <p className="text-sm text-amber-700">
                        {selected.total === 0 ? "No responses yet." : `Low sample (N = ${selected.total}); treat the colour as tentative.`}
                      </p>
                    )}
                  </div>
                  {selected._id !== view.activeConceptId && (
                    <Button className="w-full" onClick={() => makeCurrent(selected._id)}>
                      Make current topic
                    </Button>
                  )}
                  <InlineError message={error} />
                  <Separator />
                  <ConceptClusters sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} conceptId={selected._id} />
                </CardContent>
              </>
            ) : (
              <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <MousePointerClick className="size-5" aria-hidden />
                Click a concept (or Tab to it and press Enter) to see its signal breakdown.
              </CardContent>
            )}
          </Card>
          </TabsContent>
          <TabsContent value="questions" className="min-h-0 overflow-y-auto px-1">
          <ErrorBoundary label="the cluster queue">
            <ClusterQueue sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} concepts={view.concepts} />
          </ErrorBoundary>
          </TabsContent>
          <TabsContent value="rooms" className="min-h-0 overflow-y-auto">
            <ErrorBoundary label="help rooms">
              <RoomStatus sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} concepts={view.concepts} role={view.role} />
            </ErrorBoundary>
          </TabsContent>
          <TabsContent value="results" className="min-h-0 overflow-y-auto">
            <ErrorBoundary label="the peer help comparison">
              <PrePostComparison sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} />
            </ErrorBoundary>
          </TabsContent>
          {view.role === "instructor" && (
            <TabsContent value="staff" className="min-h-0 overflow-y-auto">
              <ErrorBoundary label="TAs">
                <TaManager sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} />
              </ErrorBoundary>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </main>
  );
}

/** Instructor only: one personal link per TA (shown once, right after adding), revocable one TA at a time. */
function TaManager({ sessionId, instructorSecret }: { sessionId: Id<"sessions">; instructorSecret: string }) {
  const tas = useQuery(api.tas.list, { sessionId, instructorSecret });
  const invite = useMutation(api.tas.invite);
  const revoke = useMutation(api.tas.revoke);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<{ taId: Id<"participants">; name: string; href: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only show the fresh link while that TA still exists (it may be revoked from another tab).
  const fresh = created && tas?.some((t) => t._id === created.taId) ? created : null;

  async function guard(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function onInvite(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    guard(async () => {
      const taSecret = newSecret();
      const taId = await invite({ sessionId, instructorSecret, name: trimmed, taSecret });
      setCreated({ taId, name: trimmed, href: `${window.location.origin}/ta/${sessionId}#${taSecret}` });
      setCopied(false);
      setName("");
    });
  }

  return (
    <Card aria-labelledby="tas-heading">
      <CardHeader>
        <CardTitle id="tas-heading" render={<h2 />}>TAs</CardTitle>
        <CardDescription>
          Each TA gets a personal link to this dashboard and can enter help rooms. The link is shown once; revoke a TA to cut off only
          their access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={onInvite} className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="ta-name">Add TA</label>
          <Input
            id="ta-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={TA_NAME_MAX}
            placeholder="Name shown in help rooms"
            className="h-8 w-56 bg-background"
          />
          <Button type="submit" size="sm" disabled={!name.trim()}>
            <UserPlus data-icon="inline-start" aria-hidden />
            Create TA link
          </Button>
        </form>
        {fresh && (
          <div className="space-y-1.5 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
            <p>
              Send this link to <strong>{fresh.name}</strong>. It won’t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={fresh.href} aria-label={`TA link for ${fresh.name}`} className="h-8 bg-background font-mono text-xs" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard?.writeText(fresh.href).then(() => setCopied(true))}
              >
                {copied ? <Check className="text-emerald-600" aria-hidden /> : <Copy aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        )}
        {tas === undefined ? null : tas === null || tas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No TAs yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {tas.map((t) => (
              <li key={t._id} className="flex items-center justify-between gap-2 rounded-lg border bg-background p-3">
                <span className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-sky-100 text-sky-900">
                    TA
                  </Badge>
                  <span className="font-medium">{t.name}</span>
                </span>
                <Button size="sm" variant="outline" onClick={() => guard(() => revoke({ sessionId, instructorSecret, taId: t._id }))}>
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
        <InlineError message={error} />
      </CardContent>
    </Card>
  );
}

function JoinCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const href = typeof window === "undefined" ? `/join/${code}` : `${window.location.origin}/join/${code}`;
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 ring-1 ring-foreground/5">
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Students join at /join/{code}</p>
        <p className="font-mono text-3xl font-bold tracking-[0.25em] sm:text-4xl">{code}</p>
      </div>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={copied ? "Link copied" : "Copy join link"}
        onClick={() => {
          navigator.clipboard?.writeText(href).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <Check className="text-emerald-600" aria-hidden /> : <Copy aria-hidden />}
      </Button>
    </div>
  );
}

function Stat({ label, value, detail, tone }: { label: string; value: number | string; detail?: string; tone?: "warn" }) {
  return (
    <div className="min-w-0 px-4 py-1.5 first:pl-5 last:pr-5">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold tracking-tight tabular-nums", tone === "warn" && "text-red-600")}>{value}</p>
      {detail && <p className="truncate text-[11px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

/** Instructor/TA pushes the next prompt: pick a concept and optionally type a one-line question students see under it. */
function PushPromptForm({
  concepts,
  activeConceptId,
  activePrompt,
  onPush,
  error,
}: {
  concepts: { _id: Id<"concepts">; label: string }[];
  activeConceptId: Id<"concepts"> | null;
  activePrompt: string | undefined;
  onPush: (conceptId: Id<"concepts">, question?: string) => Promise<boolean>;
  error: string | null;
}) {
  const [conceptId, setConceptId] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const target = conceptId || activeConceptId || concepts[0]?._id || "";
  const items = concepts.map((c) => ({ value: c._id, label: c._id === activeConceptId ? `${c.label} (current)` : c.label }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    const ok = await onPush(target as Id<"concepts">, question.trim() || undefined);
    setBusy(false);
    if (ok) setQuestion("");
  }

  return (
    <form onSubmit={submit} aria-label="Push prompt" className="enter">
      <Card className="ring-foreground/20">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground uppercase">
                <Megaphone className="size-3.5" aria-hidden /> Push prompt
              </span>
              <Select items={items} value={target} onValueChange={(v) => v && setConceptId(v)}>
                <SelectTrigger aria-label="Concept to push" className="min-w-56 bg-background">
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
            </label>
            <label className="min-w-0 flex-1 text-sm">
              <span className="sr-only">Question (optional)</span>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={MAX_PROMPT_LENGTH}
                placeholder="Optional question, e.g. Why does fib(1) not recurse?"
                className="bg-background"
              />
            </label>
            <Button type="submit" disabled={busy || !target}>
              Push prompt
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {activePrompt ? (
              <>
                Students now see: <span className="font-medium text-foreground">{activePrompt}</span>
              </>
            ) : (
              "Students see the current concept; add a question to show it under the description. Pushing without a question clears the previous one. Ratings are per concept, so a new question on the same concept keeps its existing answers."
            )}
          </p>
          <InlineError message={error} />
        </CardContent>
      </Card>
    </form>
  );
}
