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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { studentTokenKey, useStoredCredential } from "@/lib/credentials";
import { errorMessage } from "@/lib/errors";
import type { Level } from "@/lib/levels";
import { cn } from "@/lib/utils";

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
  const ordered = [...view.concepts].sort(
    (a, b) => Number(b._id === view.activeConceptId) - Number(a._id === view.activeConceptId),
  );

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

      <section className="space-y-3" aria-label="Concepts">
        {ordered.map((c, i) => {
          const active = c._id === view.activeConceptId;
          return (
            <Card
              key={c._id}
              className={cn("enter", active && "ring-2 ring-foreground/80")}
              style={{ "--i": i + 1 } as React.CSSProperties}
            >
              <CardHeader>
                {active && (
                  <Badge className="mb-1 w-fit">
                    <span className="relative flex size-1.5" aria-hidden>
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground/70 motion-reduce:hidden" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-primary-foreground" />
                    </span>
                    Current topic
                  </Badge>
                )}
                <CardTitle>{c.label}</CardTitle>
                <CardDescription>{c.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ConfidenceSelector
                  value={c.myLevel}
                  disabled={view.state !== "open"}
                  onChange={(level) => sendSignal(c._id, level)}
                />
              </CardContent>
            </Card>
          );
        })}
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
