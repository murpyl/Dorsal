"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

const NEW_PROMPT_CUE_MS = 3000;

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
  // Identifies what is currently being asked: the concept plus the optional pushed question.
  const promptKey = view?.activeConceptId ? `${view.activeConceptId}\n${view.activePrompt ?? ""}` : null;

  // "New prompt" cue: shown for a few seconds after the prompt changes while the page is open.
  // Keyed to the prompt so it can only ever describe the card that is currently rendered.
  const previousPrompt = useRef<string | null | undefined>(undefined);
  const [cueFor, setCueFor] = useState<string | null>(null);
  useEffect(() => {
    if (!view) return;
    const changed = previousPrompt.current !== undefined && previousPrompt.current !== promptKey;
    previousPrompt.current = promptKey;
    if (!changed || !promptKey) return;
    setCueFor(promptKey);
    const timer = setTimeout(() => setCueFor(null), NEW_PROMPT_CUE_MS);
    return () => clearTimeout(timer);
  }, [view, promptKey]);

  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!view || !token) return <p className="p-8 text-zinc-500">Joining session {code}…</p>;

  const sendSignal = (conceptId: Id<"concepts">, level: Level) =>
    upsert({ sessionId: view.sessionId, token, conceptId, level }).catch((err) => setError(errorMessage(err)));
  const current = view.concepts.find((c) => c._id === view.activeConceptId) ?? null;
  const promptNumber = current ? view.concepts.indexOf(current) + 1 : 0;
  const covered = view.coveredConceptIds
    .map((id) => view.concepts.find((c) => c._id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);
  const disabled = view.state !== "open";

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
      {current ? (
        <section
          className="space-y-2 rounded-xl border border-indigo-400 bg-indigo-50 p-4"
          aria-live="polite"
          aria-label={`Prompt ${promptNumber} of ${view.concepts.length}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Current topic</p>
            {cueFor === promptKey && (
              <span className="animate-pulse rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">New prompt</span>
            )}
          </div>
          <h2 className="text-lg font-semibold">
            Prompt {promptNumber} of {view.concepts.length}
          </h2>
          <p className="font-medium">{current.label}</p>
          <p className="text-sm text-zinc-600">{current.description}</p>
          {view.activePrompt && <p className="rounded-lg bg-white px-3 py-2 text-base font-medium text-indigo-900">{view.activePrompt}</p>}
          <ConfidenceSelector value={current.myLevel} disabled={disabled} onChange={(level) => sendSignal(current._id, level)} />
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
          Waiting for the instructor&apos;s first prompt.
        </section>
      )}
      {covered.length > 0 && (
        <details className="rounded-xl border border-zinc-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-700">
            Already covered ({covered.length}) <span className="font-normal text-zinc-500">— you can still change your answer</span>
          </summary>
          <div className="space-y-4 border-t border-zinc-200 p-4">
            {covered.map((c) => (
              <section key={c._id} className="space-y-2" aria-label={c.label}>
                <h3 className="font-medium">{c.label}</h3>
                <p className="text-sm text-zinc-600">{c.description}</p>
                <ConfidenceSelector value={c.myLevel} disabled={disabled} onChange={(level) => sendSignal(c._id, level)} />
              </section>
            ))}
          </div>
        </details>
      )}
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
