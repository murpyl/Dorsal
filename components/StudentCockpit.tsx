"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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

      <section aria-label="Current topic" aria-live="polite" className="py-2">
        {current ? (
          <div key={current._id} className="enter space-y-4">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
              <span className="relative flex size-2" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Live now
            </p>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-semibold text-balance sm:text-3xl">{current.label}</h2>
              <p className="text-pretty text-muted-foreground">{current.description}</p>
            </div>
            <ConfidenceSelector
              value={current.myLevel}
              disabled={view.state !== "open"}
              onChange={(level) => sendSignal(current._id, level)}
            />
            <p className="text-xs text-muted-foreground">
              You only see the topic being covered right now; this changes as the instructor moves on.
            </p>
          </div>
        ) : (
          <div className="enter space-y-1 py-10 text-center">
            <p className="font-heading text-lg font-medium">Waiting for the instructor to start a topic…</p>
            <p className="text-sm text-muted-foreground">This page updates live, nothing to refresh.</p>
          </div>
        )}
      </section>

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
