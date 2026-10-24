"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { instructorSecretKey, useStoredCredential } from "@/lib/credentials";
import { LEVELS } from "@/lib/levels";

const LOW_SAMPLE = 5;

export function RadarDashboard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const secret = useStoredCredential(instructorSecretKey(sessionId), false);
  const view = useQuery(
    api.sessions.getInstructorView,
    secret ? { sessionId, instructorSecret: secret } : "skip",
  );

  if (secret === null || view === null)
    return <p className="p-8 text-red-600">No instructor access for this session on this device.</p>;
  if (view === undefined) return <p className="p-8 text-zinc-500">Loading dashboard…</p>;

  const responses = view.concepts.reduce((sum, c) => sum + c.total, 0);
  const confused = view.concepts.reduce((sum, c) => sum + c.counts.confused, 0);

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
                {c.total > 0 && c.total < LOW_SAMPLE && <span className="ml-2 text-amber-600">low sample</span>}
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
