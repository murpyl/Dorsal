"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { LOW_SAMPLE } from "@/components/ConceptGraph";
import { errorMessage } from "@/lib/errors";
import { LEVELS } from "@/lib/levels";

type Phase = "pre" | "post";
type Tally = { counts: Record<(typeof LEVELS)[number]["value"], number>; total: number };

export function SessionControls({
  sessionId,
  instructorSecret,
  phase,
  state,
}: {
  sessionId: Id<"sessions">;
  instructorSecret: string;
  phase: Phase;
  state: "open" | "closed";
}) {
  const setPhase = useMutation(api.sessions.setPhase);
  const closeSession = useMutation(api.sessions.close);
  const [error, setError] = useState<string | null>(null);

  async function guard(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (state === "closed") return <p className="text-sm font-medium text-amber-700">Session closed · no new signals accepted</p>;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <div role="group" aria-label="Signal phase" className="inline-flex overflow-hidden rounded-lg border border-zinc-300">
        {(["pre", "post"] as const).map((p) => (
          <button
            key={p}
            aria-pressed={phase === p}
            onClick={() => guard(() => setPhase({ sessionId, instructorSecret, phase: p }))}
            className={`px-3 py-1.5 font-medium ${phase === p ? "bg-indigo-600 text-white" : "bg-white text-zinc-700 hover:bg-zinc-50"}`}
          >
            {p === "pre" ? "Pre (before help)" : "Post (after help)"}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          if (confirm("Close this session? Students can no longer send signals or chat.")) guard(() => closeSession({ sessionId, instructorSecret }));
        }}
        className="rounded-lg border border-red-300 px-3 py-1.5 font-medium text-red-700 hover:bg-red-50"
      >
        Close session
      </button>
      {error && <p className="w-full text-red-600">{error}</p>}
    </div>
  );
}

export function PrePostComparison({ sessionId, instructorSecret }: { sessionId: Id<"sessions">; instructorSecret: string }) {
  const rows = useQuery(api.signals.prePostByConcept, { sessionId, instructorSecret });

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4" aria-labelledby="pre-post">
      <div>
        <h2 id="pre-post" className="font-medium">
          Before vs after peer help
        </h2>
        <p className="text-sm text-zinc-600">
          Self-reported understanding per phase. Each bar shows its own N; the two phases are separate response sets. A shift here
          measures what students <em>say</em>, not verified learning gains.
        </p>
      </div>
      {!rows ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.conceptId} className="space-y-1">
              <p className="text-sm font-medium">{r.label}</p>
              <PhaseBar phase="pre" tally={r.pre} />
              <PhaseBar phase="post" tally={r.post} />
            </li>
          ))}
        </ul>
      )}
      <p className="flex flex-wrap gap-3 text-xs text-zinc-600">
        {LEVELS.map((l) => (
          <span key={l.value} className="flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${l.color}`} aria-hidden /> {l.label}
          </span>
        ))}
      </p>
    </section>
  );
}

function PhaseBar({ phase, tally }: { phase: Phase; tally: Tally }) {
  const summary = LEVELS.map((l) => `${l.label} ${tally.counts[l.value]}`).join(", ");
  return (
    <div className="grid grid-cols-[3rem_1fr_7rem] items-center gap-2 text-xs">
      <span className="font-mono uppercase text-zinc-500">{phase}</span>
      <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100" role="img" aria-label={`${phase}: ${summary}, N = ${tally.total}`}>
        {tally.total > 0 &&
          LEVELS.map((l) => (
            <div key={l.value} className={l.color} style={{ width: `${(tally.counts[l.value] / tally.total) * 100}%` }} />
          ))}
      </div>
      <span className="text-zinc-600">
        N = {tally.total}
        {tally.total === 0 ? <span className="ml-1 text-zinc-400">none</span> : tally.total < LOW_SAMPLE && <span className="ml-1 text-amber-600">low</span>}
      </span>
    </div>
  );
}
