"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Check, Copy, MousePointerClick } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { errorMessage } from "@/lib/errors";
import { instructorSecretKey, useStoredCredential } from "@/lib/credentials";
import { LEVELS, PHASE_LABEL } from "@/lib/levels";
import { cn } from "@/lib/utils";

export function RadarDashboard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const secret = useStoredCredential(instructorSecretKey(sessionId), false);
  const view = useQuery(
    api.sessions.getInstructorView,
    secret ? { sessionId, instructorSecret: secret } : "skip",
  );
  const setActiveConcept = useMutation(api.sessions.setActiveConcept);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (secret === null || view === null)
    return (
      <main className="mx-auto w-full max-w-xl p-8">
        <InlineError message="No instructor access for this session on this device." />
      </main>
    );
  if (view === undefined) return <PageSkeleton wide />;

  const responses = view.concepts.reduce((sum, c) => sum + c.total, 0);
  const confused = view.concepts.reduce((sum, c) => sum + c.counts.confused, 0);
  const selected = view.concepts.find((c) => c._id === selectedId) ?? null;

  async function makeCurrent(conceptId: Id<"concepts">) {
    setError(null);
    try {
      await setActiveConcept({ sessionId: sessionId as Id<"sessions">, instructorSecret: secret!, conceptId });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <main className="w-full space-y-6 px-4 py-5 pb-12 md:px-8">
      <header className="enter flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Brand />
          <div>
            <p className="text-sm text-muted-foreground">Instructor · signals: {PHASE_LABEL[view.phase]}</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{view.title}</h1>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <JoinCode code={view.code} />
          <SessionControls sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} phase={view.phase} state={view.state} />
        </div>
      </header>
      <ConnectionStatus />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4" aria-label="Session metrics">
        <Metric
          i={0}
          label="Participants"
          value={view.participantCount}
          detail={view.simulatedCount > 0 ? `incl. ${view.simulatedCount} simulated` : undefined}
        />
        <Metric i={1} label="Responses" value={responses} detail="this phase" />
        <Metric i={2} label="Confused responses" value={confused} detail={`of ${responses}`} tone={confused > 0 ? "warn" : undefined} />
        <Metric i={3} label="Open clusters" value={view.publishedClusterCount} detail="published" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_20rem]" aria-label="Concept graph and details">
        <ConceptGraph
          concepts={view.concepts}
          edges={view.edges}
          activeConceptId={view.activeConceptId}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <Card aria-label="Concept details" className="h-fit lg:sticky lg:top-4">
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
                    <p className="text-sm text-amber-300">
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
      </section>

      <ErrorBoundary label="the cluster queue">
        <ClusterQueue sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} concepts={view.concepts} />
      </ErrorBoundary>

      <section className="space-y-3" id="per-concept" aria-labelledby="per-concept-heading">
        <div>
          <h2 id="per-concept-heading" className="text-lg font-semibold tracking-tight">
            Per-concept distribution
          </h2>
          <p className="text-sm text-muted-foreground">Text alternative to the graph colours.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {view.concepts.map((c) => {
            const active = c._id === view.activeConceptId;
            return (
              <Card key={c._id} size="sm" className={cn(active && "ring-2 ring-foreground/80")}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2" render={<h3 />}>
                    {c.label}
                    {active && <Badge>current topic</Badge>}
                    {c.openClusters > 0 && (
                      <Badge variant="secondary" className="bg-amber-400/15 text-amber-200">
                        {c.openClusters} open cluster{c.openClusters === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="tabular-nums">
                    N = {c.total}
                    {c.total < LOW_SAMPLE && <span className="ml-2 text-amber-300">{c.total === 0 ? "no responses" : "low sample"}</span>}
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

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Pre/post comparison and help rooms">
        <ErrorBoundary label="the pre/post comparison">
          <PrePostComparison sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} />
        </ErrorBoundary>
        <ErrorBoundary label="help rooms">
          <RoomStatus sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} concepts={view.concepts} />
        </ErrorBoundary>
      </section>
    </main>
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
        {copied ? <Check className="text-emerald-400" aria-hidden /> : <Copy aria-hidden />}
      </Button>
    </div>
  );
}

function Metric({ i, label, value, detail, tone }: { i: number; label: string; value: number; detail?: string; tone?: "warn" }) {
  return (
    <Card size="sm" className="enter" style={{ "--i": i } as React.CSSProperties}>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className={cn("text-3xl font-semibold tracking-tight tabular-nums", tone === "warn" && "text-red-400")}>{value}</span>
          {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
        </p>
      </CardContent>
    </Card>
  );
}
