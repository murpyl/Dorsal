"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Brand } from "@/components/Brand";
import { ConfidenceSelector } from "@/components/ConfidenceSelector";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InlineError } from "@/components/InlineError";
import { PageSkeleton } from "@/components/PageSkeleton";
import { PublishedClusters } from "@/components/PublishedClusters";
import { QuestionComposer } from "@/components/QuestionComposer";
import { HelperOptIn } from "@/components/HelperOptIn";
import { RoomList } from "@/components/RoomList";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { studentTokenKey, useStoredCredential } from "@/lib/credentials";
import { errorMessage } from "@/lib/errors";
import type { Level } from "@/lib/levels";
import { cn } from "@/lib/utils";

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

  if (error)
    return (
      <main className="mx-auto w-full max-w-xl p-4">
        <InlineError message={error} />
      </main>
    );
  if (!view || !token) return <PageSkeleton />;

  const sendSignal = (conceptId: Id<"concepts">, level: Level) =>
    upsert({ sessionId: view.sessionId, token, conceptId, level }).catch((err) => setError(errorMessage(err)));
  const current = view.concepts.find((c) => c._id === view.activeConceptId) ?? null;
  const promptNumber = current ? view.concepts.indexOf(current) + 1 : 0;
  const covered = view.coveredConceptIds
    .map((id) => view.concepts.find((c) => c._id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);
  const disabled = view.state !== "open";

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 p-3 pb-12 sm:p-4">
      <header className="enter space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Brand />
          <Badge variant="outline" className="font-mono tracking-widest">
            {code}
          </Badge>
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{view.title}</h1>
          <p className="text-sm break-words text-muted-foreground">
            You appear as <span className="font-medium text-foreground">{view.alias}</span> · pseudonymous to classmates
          </p>
        </div>
        {view.state === "closed" && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-900">
            This session is closed
          </Badge>
        )}
      </header>
      <ConnectionStatus />

      {current ? (
        <Card className="enter ring-2 ring-foreground/80" aria-live="polite" aria-label={`Prompt ${promptNumber} of ${view.concepts.length}`}>
          <CardHeader>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge>
                <span className="relative flex size-1.5" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground/70 motion-reduce:hidden" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary-foreground" />
                </span>
                Current topic
              </Badge>
              {cueFor === promptKey && (
                <Badge variant="secondary" className="enter animate-pulse bg-amber-100 text-amber-900 motion-reduce:animate-none">
                  New prompt
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs font-medium tracking-wide uppercase">
              Prompt {promptNumber} of {view.concepts.length}
            </CardDescription>
            <CardTitle render={<h2 />} className="text-lg">
              {current.label}
            </CardTitle>
            <CardDescription>{current.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {view.activePrompt && <p className="rounded-lg bg-muted px-3 py-2 text-base font-medium">{view.activePrompt}</p>}
            <ConfidenceSelector value={current.myLevel} disabled={disabled} onChange={(level) => sendSignal(current._id, level)} />
          </CardContent>
        </Card>
      ) : (
        <div className="enter rounded-xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Waiting for the instructor&apos;s first prompt.
        </div>
      )}
      {covered.length > 0 && (
        <details className="enter group/covered rounded-xl bg-card ring-1 ring-foreground/10" style={{ "--i": 1 } as React.CSSProperties}>
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
            <span className="inline-block transition-transform duration-150 ease-out group-open/covered:rotate-90" aria-hidden>
              ›
            </span>
            Already covered ({covered.length})
            <span className="font-normal text-muted-foreground">— you can still change your answer</span>
          </summary>
          <div className="space-y-5 border-t p-4">
            {covered.map((c) => (
              <section key={c._id} className="space-y-2" aria-label={c.label}>
                <h3 className="font-medium">{c.label}</h3>
                <p className="text-sm text-muted-foreground">{c.description}</p>
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
