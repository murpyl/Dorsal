"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConfidenceSelector } from "@/components/ConfidenceSelector";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PublishedClusters } from "@/components/PublishedClusters";
import { QuestionComposer } from "@/components/QuestionComposer";
import { HelperOptIn } from "@/components/HelperOptIn";
import { RoomList } from "@/components/RoomList";
import { studentTokenKey, useStoredCredential } from "@/lib/credentials";
import { errorMessage } from "@/lib/errors";
import type { Level } from "@/lib/levels";

export function StudentCockpit() {
  const code = useParams<{ code: string }>().code.toUpperCase();
  const token = useStoredCredential(studentTokenKey(code), true);
  const join = useMutation(api.sessions.join);
  const upsert = useMutation(api.signals.upsert);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    join({ code, token }).catch((err) => setError(errorMessage(err)));
  }, [code, token, join]);

  const view = useQuery(api.sessions.getStudentView, token ? { code, token } : "skip");

  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!view || !token) return <p className="p-8 text-zinc-500">Joining session {code}…</p>;

  const sendSignal = (conceptId: Id<"concepts">, level: Level) =>
    upsert({ sessionId: view.sessionId, token, conceptId, level }).catch((err) => setError(errorMessage(err)));
  const ordered = [...view.concepts].sort(
    (a, b) => Number(b._id === view.activeConceptId) - Number(a._id === view.activeConceptId),
  );

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 p-3 sm:p-4">
      <header className="space-y-1">
        <p className="text-sm break-words text-zinc-500">
          {code} · you are <span className="font-medium">{view.alias}</span> (pseudonymous to classmates)
        </p>
        <h1 className="text-xl font-semibold sm:text-2xl">{view.title}</h1>
        {view.state === "closed" && <p className="text-amber-600">This session is closed.</p>}
      </header>
      <ConnectionStatus />
      {ordered.map((c) => (
        <section
          key={c._id}
          className={`space-y-2 rounded-xl border p-4 ${c._id === view.activeConceptId ? "border-indigo-400 bg-indigo-50" : "border-zinc-200 bg-white"}`}
        >
          {c._id === view.activeConceptId && (
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Current topic</p>
          )}
          <h2 className="font-medium">{c.label}</h2>
          <p className="text-sm text-zinc-600">{c.description}</p>
          <ConfidenceSelector
            value={c.myLevel}
            disabled={view.state !== "open"}
            onChange={(level) => sendSignal(c._id, level)}
          />
        </section>
      ))}
      <ErrorBoundary label="the question box">
        <QuestionComposer sessionId={view.sessionId} token={token} concepts={view.concepts} activeConceptId={view.activeConceptId} />
      </ErrorBoundary>
      <ErrorBoundary label="published clusters">
        <PublishedClusters sessionId={view.sessionId} token={token} code={code} concepts={view.concepts} />
      </ErrorBoundary>
      <ErrorBoundary label="helper opt-in">
        <HelperOptIn sessionId={view.sessionId} token={token} concepts={view.concepts} />
      </ErrorBoundary>
      <ErrorBoundary label="help rooms">
        <RoomList sessionId={view.sessionId} token={token} code={code} concepts={view.concepts} />
      </ErrorBoundary>
    </main>
  );
}
