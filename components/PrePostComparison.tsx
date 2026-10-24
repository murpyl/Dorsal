"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { LOW_SAMPLE } from "@/components/ConceptGraph";
import { InlineError } from "@/components/InlineError";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/errors";
import { LEVELS, PHASE_LABEL, type Phase } from "@/lib/levels";

type Tally = { counts: Record<(typeof LEVELS)[number]["value"], number>; total: number };

export function SessionControls({
  sessionId,
  instructorSecret,
  state,
}: {
  sessionId: Id<"sessions">;
  instructorSecret: string;
  state: "open" | "closed";
}) {
  const closeSession = useMutation(api.sessions.close);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function guard(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (state === "closed")
    return (
      <Badge variant="secondary" className="bg-amber-400/15 text-amber-200">
        Session closed · no new signals accepted
      </Badge>
    );

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogTrigger render={<Button variant="destructive" />}>Close session</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this session?</AlertDialogTitle>
            <AlertDialogDescription>Students can no longer send signals or chat. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it open</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                guard(() => closeSession({ sessionId, instructorSecret }));
              }}
            >
              Close session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <InlineError message={error} className="w-full" />
    </div>
  );
}

export function PrePostComparison({ sessionId, instructorSecret }: { sessionId: Id<"sessions">; instructorSecret: string }) {
  const rows = useQuery(api.signals.prePostByConcept, { sessionId, instructorSecret });

  return (
    <Card aria-labelledby="pre-post">
      <CardHeader>
        <CardTitle id="pre-post" render={<h2 />}>Before vs after peer help</CardTitle>
        <CardDescription>
          Self-reported understanding. <em>Before</em> is each student&apos;s rating on the session page; <em>after</em> is the rating
          they update inside a peer help room. Each bar shows its own N; the two are separate response sets. A shift here measures what
          students <em>say</em>, not verified learning gains.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!rows ? (
          <div className="space-y-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : (
          <ul className="space-y-4">
            {rows.map((r) => (
              <li key={r.conceptId} className="space-y-1.5">
                <p className="text-sm font-medium">{r.label}</p>
                <PhaseBar phase="pre" tally={r.pre} />
                <PhaseBar phase="post" tally={r.post} />
              </li>
            ))}
          </ul>
        )}
        <Legend />
      </CardContent>
    </Card>
  );
}

export function Legend() {
  return (
    <p className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {LEVELS.map((l) => (
        <span key={l.value} className="flex items-center gap-1.5">
          <span className={`inline-block size-2 rounded-full ${l.dot}`} aria-hidden /> {l.label}
        </span>
      ))}
    </p>
  );
}

/** Stacked distribution bar; widths animate (transform-free, but width changes are rare: one per signal). */
export function DistributionBar({ tally, className = "h-2.5" }: { tally: Tally; className?: string }) {
  return (
    <div className={`flex ${className} overflow-hidden rounded-full bg-muted`} aria-hidden>
      {tally.total > 0 &&
        LEVELS.map((l) => (
          <div
            key={l.value}
            className={`${l.color} transition-[width] duration-200 ease-out motion-reduce:transition-none`}
            style={{ width: `${(tally.counts[l.value] / tally.total) * 100}%` }}
          />
        ))}
    </div>
  );
}

function PhaseBar({ phase, tally }: { phase: Phase; tally: Tally }) {
  const summary = LEVELS.map((l) => `${l.label} ${tally.counts[l.value]}`).join(", ");
  return (
    <div className="grid grid-cols-[3rem_1fr_7rem] items-center gap-2 text-xs">
      <span className="text-muted-foreground">{phase === "pre" ? "Before" : "After"}</span>
      <div role="img" aria-label={`${PHASE_LABEL[phase]}: ${summary}, N = ${tally.total}`}>
        <DistributionBar tally={tally} />
      </div>
      <span className="tabular-nums text-muted-foreground">
        N = {tally.total}
        {tally.total === 0 ? (
          <span className="ml-1 text-muted-foreground/60">none</span>
        ) : (
          tally.total < LOW_SAMPLE && <span className="ml-1 text-amber-300">low</span>
        )}
      </span>
    </div>
  );
}
