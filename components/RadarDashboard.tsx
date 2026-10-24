"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ClusterQueue, ConceptClusters } from "@/components/ClusterQueue";
import { ConceptGraph, LOW_SAMPLE } from "@/components/ConceptGraph";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PrePostComparison, SessionControls } from "@/components/PrePostComparison";
import { RoomStatus } from "@/components/RoomList";
import { errorMessage } from "@/lib/errors";
import { instructorSecretKey, useStoredCredential } from "@/lib/credentials";
import { LEVELS } from "@/lib/levels";
import { btnPrimary } from "@/lib/ui";

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
    return <p className="p-8 text-red-600">No instructor access for this session on this device.</p>;
  if (view === undefined) return <p className="p-8 text-zinc-500">Loading dashboard…</p>;

  const responses = view.concepts.reduce((sum, c) => sum + c.total, 0);
  const confused = view.concepts.reduce((sum, c) => sum + c.counts.confused, 0);
  const selected = view.concepts.find((c) => c._id === selectedId) ?? null;
  const participation = view.participantCount > 0 ? Math.round((view.answeredCount / view.participantCount) * 100) : 0;
  const coverage = (id: string) =>
    id === view.activeConceptId ? "current" : view.coveredConceptIds.includes(id as Id<"concepts">) ? "covered" : "upcoming";

  async function makeCurrent(conceptId: Id<"concepts">) {
    setError(null);
    try {
      await setActiveConcept({ sessionId: sessionId as Id<"sessions">, instructorSecret: secret!, conceptId });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <main className="w-full space-y-6 px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Instructor</p>
          <h1 className="text-3xl font-semibold">{view.title}</h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">Students join at /join/{view.code}</p>
          <p className="font-mono text-4xl font-bold tracking-widest">{view.code}</p>
          <SessionControls sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} state={view.state} />
        </div>
      </header>
      <ConnectionStatus />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-5" aria-label="Session metrics">
        <Metric
          label="Participants"
          value={view.participantCount}
          detail={view.simulatedCount > 0 ? `incl. ${view.simulatedCount} simulated` : undefined}
        />
        <Metric
          label="Participation"
          value={`${view.answeredCount} / ${view.participantCount}`}
          detail={`${participation}% answered the current prompt${view.simulatedCount > 0 ? ` · incl. ${view.simulatedCount} simulated` : ""}`}
        />
        <Metric label="Responses" value={responses} />
        <Metric label="Confused responses" value={confused} detail={`of ${responses}`} />
        <Metric label="Open clusters" value={view.publishedClusterCount} detail="published" />
      </section>
      {/* Lecture Listener (session G): <LectureListener sessionId instructorSecret /> goes here, directly below the metrics grid. */}

      <section className="grid gap-4 lg:grid-cols-[1fr_20rem]" aria-label="Concept graph and details">
        <ConceptGraph
          concepts={view.concepts}
          edges={view.edges}
          activeConceptId={view.activeConceptId}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <aside className="rounded-xl border border-zinc-200 bg-white p-4 text-sm" aria-label="Concept details">
          {selected ? (
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">{selected.label}</h2>
                <p className="text-zinc-600">{selected.description}</p>
              </div>
              <ul className="space-y-1">
                {LEVELS.map((l) => (
                  <li key={l.value} className="flex items-center gap-2">
                    <span className={`inline-block h-3 w-3 rounded-full ${l.color}`} aria-hidden />
                    {l.label}: <strong>{selected.counts[l.value]}</strong> / {selected.total}
                  </li>
                ))}
              </ul>
              {selected.total < LOW_SAMPLE && (
                <p className="text-amber-700">
                  {selected.total === 0 ? "No responses yet." : `Low sample (N = ${selected.total}); treat the colour as tentative.`}
                </p>
              )}
              {selected._id === view.activeConceptId ? (
                <p className="font-medium text-indigo-700">Current topic</p>
              ) : (
                <button
                  onClick={() => makeCurrent(selected._id)}
                  className={btnPrimary}
                >
                  Make current topic
                </button>
              )}
              {error && <p className="text-red-600">{error}</p>}
              <ConceptClusters sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} conceptId={selected._id} />
            </div>
          ) : (
            <p className="text-zinc-500">Click a concept (or Tab to it and press Enter) to see its signal breakdown.</p>
          )}
        </aside>
      </section>

      <ErrorBoundary label="the cluster queue">
      <ClusterQueue sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} concepts={view.concepts} />
      </ErrorBoundary>

      <section className="space-y-3" id="per-concept" aria-labelledby="per-concept-heading">
        <h2 id="per-concept-heading" className="text-lg font-semibold">
          Per-concept distribution <span className="text-sm font-normal text-zinc-500">(text alternative to the graph colours)</span>
        </h2>
        {view.concepts.map((c) => (
          <div
            key={c._id}
            className={`rounded-xl border bg-white p-4 ${c._id === view.activeConceptId ? "border-indigo-400" : "border-zinc-200"}`}
          >
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-medium">
                {c.label}
                {coverage(c._id) === "current" && <span className="ml-2 text-xs font-semibold uppercase text-indigo-600">current topic</span>}
                {coverage(c._id) === "covered" && (
                  <span className="ml-2 text-xs font-normal text-zinc-500">
                    covered · {c.total} answered
                  </span>
                )}
                {coverage(c._id) === "upcoming" && <span className="ml-2 text-xs font-normal text-zinc-400">not yet covered</span>}
                {c.openClusters > 0 && (
                  <span className="ml-2 text-xs font-normal text-amber-700">
                    {c.openClusters} open cluster{c.openClusters === 1 ? "" : "s"}
                  </span>
                )}
              </h3>
              <p className="text-sm text-zinc-600">
                N = {c.total}
                {c.total < LOW_SAMPLE && (
                  <span className="ml-2 text-amber-600">{c.total === 0 ? "no responses" : "low sample"}</span>
                )}
              </p>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
              {c.total > 0 &&
                LEVELS.map((l) => (
                  <div key={l.value} className={l.color} style={{ width: `${(c.counts[l.value] / c.total) * 100}%` }} />
                ))}
            </div>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {LEVELS.map((l) => (
                <span key={l.value}>
                  {l.label}: <strong>{c.counts[l.value]}</strong> / {c.total}
                </span>
              ))}
            </p>
          </div>
        ))}
      </section>


      <section className="grid gap-4 lg:grid-cols-2" aria-label="Peer help comparison and help rooms">
        <ErrorBoundary label="the peer help comparison">
          <PrePostComparison sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} />
        </ErrorBoundary>
        <ErrorBoundary label="help rooms">
          <RoomStatus sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} concepts={view.concepts} />
        </ErrorBoundary>
      </section>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="text-3xl font-semibold">{value}</p>
      {detail && <p className="text-sm text-zinc-500">{detail}</p>}
    </div>
  );
}
