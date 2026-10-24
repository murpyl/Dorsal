"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConceptGraph, LOW_SAMPLE } from "@/components/ConceptGraph";
import { RoomStatus } from "@/components/RoomList";
import { errorMessage } from "@/lib/errors";
import { instructorSecretKey, useStoredCredential } from "@/lib/credentials";
import { LEVELS } from "@/lib/levels";

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

  async function makeCurrent(conceptId: Id<"concepts">) {
    setError(null);
    try {
      await setActiveConcept({ sessionId: sessionId as Id<"sessions">, instructorSecret: secret!, conceptId });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Instructor · phase {view.phase}</p>
          <h1 className="text-3xl font-semibold">{view.title}</h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">Students join at /join/{view.code}</p>
          <p className="font-mono text-4xl font-bold tracking-widest">{view.code}</p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-4">
        <Metric label="Participants" value={view.participantCount} />
        <Metric label="Responses" value={responses} />
        <Metric label="Confused responses" value={confused} detail={`of ${responses}`} />
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_18rem]">
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
                  className="rounded-lg bg-indigo-600 px-3 py-2 font-medium text-white hover:bg-indigo-700"
                >
                  Make current topic
                </button>
              )}
              {error && <p className="text-red-600">{error}</p>}
              <div className="border-t border-zinc-200 pt-3">
                <h3 className="font-medium">Question clusters</h3>
                <p className="text-zinc-500">None published for this concept yet.</p>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500">Click a concept to see its signal breakdown.</p>
          )}
        </aside>
      </section>

      <section className="space-y-3">
        {view.concepts.map((c) => (
          <div
            key={c._id}
            className={`rounded-xl border bg-white p-4 ${c._id === view.activeConceptId ? "border-indigo-400" : "border-zinc-200"}`}
          >
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-medium">{c.label}</h2>
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
            <p className="mt-2 flex gap-4 text-sm">
              {LEVELS.map((l) => (
                <span key={l.value}>
                  {l.label}: <strong>{c.counts[l.value]}</strong> / {c.total}
                </span>
              ))}
            </p>
          </div>
        ))}
      </section>

      <RoomStatus sessionId={sessionId as Id<"sessions">} instructorSecret={secret!} concepts={view.concepts} />
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="text-3xl font-semibold">
        {value} {detail && <span className="text-base font-normal text-zinc-500">{detail}</span>}
      </p>
    </div>
  );
}
