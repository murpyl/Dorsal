"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Expand, Radio } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Brand } from "@/components/Brand";
import { InlineError } from "@/components/InlineError";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { instructorSecretKey, taSecretKey, useStoredCredential } from "@/lib/credentials";
import { LEVELS } from "@/lib/levels";
import { cn } from "@/lib/utils";

const QR_CELLS = [
  1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1,
];

export function ProjectorMode() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const instructorSecret = useStoredCredential(instructorSecretKey(sessionId), false);
  const taSecret = useStoredCredential(taSecretKey(sessionId), false);
  const secret = instructorSecret === undefined || taSecret === undefined ? undefined : (taSecret ?? instructorSecret);
  const view = useQuery(api.sessions.getInstructorView, secret ? { sessionId, instructorSecret: secret } : "skip");
  // A chip click overrides the live concept only until the instructor pushes a new one.
  const [override, setOverride] = useState<{ conceptId: string; forActive: string | null } | null>(null);
  const selectedId = override && override.forActive === (view?.activeConceptId ?? null) ? override.conceptId : view?.activeConceptId ?? null;
  const setSelectedId = (conceptId: string) => setOverride({ conceptId, forActive: view?.activeConceptId ?? null });

  if (secret === null || view === null) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-8">
        <InlineError message="No instructor access for this session on this device." />
      </main>
    );
  }
  if (view === undefined) return <PageSkeleton wide />;

  const selected = view.concepts.find((concept) => concept._id === selectedId)
    ?? view.concepts.find((concept) => concept._id === view.activeConceptId)
    ?? view.concepts[0];
  if (!selected) return null;

  const total = selected.total;
  const participation = view.participantCount ? view.answeredCount / view.participantCount : 0;
  const covered = new Set(view.coveredConceptIds);
  const prompt = selected._id === view.activeConceptId && view.activePrompt?.question
    ? view.activePrompt.question
    : selected.description;

  return (
    <main className="dark projector relative isolate flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="relative z-10 flex items-start justify-between gap-8 px-10 pt-8 xl:px-14 xl:pt-10">
        <div className="flex items-center gap-5">
          <Brand className="text-foreground [&>span]:size-11 [&>span]:bg-foreground/5 [&>span]:text-primary [&_svg]:size-8" />
          <div className="h-10 w-px bg-border" aria-hidden />
          <div className="flex items-center gap-4">
            <QrPlaceholder />
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-muted-foreground uppercase">Join at Dorsal</p>
              <p className="font-mono text-3xl font-semibold tracking-[0.14em]">{view.code}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5 rounded-full bg-card/60 py-3 pr-6 pl-3 ring-1 ring-border backdrop-blur">
          <ParticipationRing progress={participation} />
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-teal-300">
              <Radio className="size-4" aria-hidden />
              Live participation
            </p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums">
              {view.answeredCount} <span className="text-muted-foreground">/ {view.participantCount}</span>
              <span className="ml-2 text-base font-medium text-muted-foreground">answered</span>
            </p>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-12 py-8" aria-live="polite">
        <div key={selected._id} className="projector-enter mb-9 text-center">
          <p className="mb-3 text-sm font-semibold tracking-[0.24em] text-primary uppercase">Current concept</p>
          <p role="heading" aria-level={1} className="font-heading text-5xl leading-tight font-semibold tracking-tight text-balance xl:text-7xl">
            {selected.label}
          </p>
          <p className="mx-auto mt-5 max-w-4xl truncate text-2xl text-muted-foreground xl:text-3xl">
            {prompt || "How confident are you with this concept?"}
          </p>
        </div>

        <div className="space-y-5" key={`bars-${selected._id}`}>
          {LEVELS.map((level, index) => {
            const count = selected.counts[level.value];
            const percent = total ? (count / total) * 100 : 0;
            return (
              <div key={level.value} className="projector-enter grid grid-cols-[12rem_minmax(0,1fr)_5rem] items-center gap-6" style={{ "--i": index } as React.CSSProperties}>
                <p className="text-right text-xl font-semibold xl:text-2xl">{level.label}</p>
                <div className="h-14 overflow-hidden rounded-full bg-foreground/8 ring-1 ring-inset ring-foreground/10 xl:h-16">
                  <div
                    className={cn("projector-bar h-full min-w-2 rounded-full shadow-[0_0_2rem_color-mix(in_oklch,currentColor,transparent_60%)]", level.color)}
                    style={{ "--bar-width": `${percent}%` } as React.CSSProperties}
                  />
                </div>
                <p className="text-4xl font-semibold tabular-nums xl:text-5xl">{count}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center font-mono text-lg tracking-[0.18em] text-muted-foreground">N = {total}</p>
      </section>

      <footer className="relative z-10 px-10 pb-9 xl:px-14 xl:pb-11">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Lecture concepts</p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Expand className="size-3.5" aria-hidden />
            Select a concept to preview
          </p>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {view.concepts.slice(0, 5).map((concept, index) => {
            const current = concept._id === selected._id;
            return (
              <Button
                key={concept._id}
                variant="ghost"
                onClick={() => setSelectedId(concept._id)}
                className={cn(
                  "h-auto min-w-0 justify-start rounded-xl border px-4 py-3 text-left",
                  current
                    ? "border-primary/60 bg-primary/15 text-foreground ring-2 ring-primary/30 hover:bg-primary/20"
                    : "border-border bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground",
                )}
              >
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs tabular-nums", current ? "bg-primary text-primary-foreground" : covered.has(concept._id) ? "bg-teal-400/20 text-teal-300" : "bg-foreground/5")}>
                  {covered.has(concept._id) ? "✓" : index + 1}
                </span>
                <span className="truncate">{concept.label}</span>
              </Button>
            );
          })}
        </div>
      </footer>

      <div className="projector-wave projector-wave-back" aria-hidden />
      <div className="projector-wave projector-wave-front" aria-hidden />
    </main>
  );
}

function QrPlaceholder() {
  return (
    <div className="grid size-16 grid-cols-5 gap-0.5 rounded-lg bg-foreground p-1.5 shadow-lg" aria-label="QR code placeholder">
      {QR_CELLS.map((filled, index) => (
        <span key={index} className={filled ? "bg-background" : "bg-transparent"} />
      ))}
    </div>
  );
}

function ParticipationRing({ progress }: { progress: number }) {
  const circumference = 251.2;
  return (
    <div className="relative grid size-20 place-items-center">
      <svg viewBox="0 0 96 96" className="-rotate-90" aria-hidden>
        <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="7" className="text-foreground/10" />
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="text-teal-400 transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute text-sm font-semibold tabular-nums">{Math.round(progress * 100)}%</span>
    </div>
  );
}
