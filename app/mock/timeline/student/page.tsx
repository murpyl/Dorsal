"use client";

import { useState } from "react";
import { ArrowDown, ArrowRight, CheckCircle2, DoorOpen, HandHelping, LogIn, MessagesSquare, Pin, Send, Undo2 } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ConfidenceSelector } from "@/components/ConfidenceSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { LEVELS, type Level } from "@/lib/levels";
import { cn } from "@/lib/utils";
import {
  activeConceptId,
  clusterById,
  conceptById,
  conceptLabel,
  concepts,
  me,
  roomById,
  session,
  studentEvents,
  studentSeenUntil,
} from "../fixtures";
import { ConceptChips, LevelChip, NewDivider, TimelineItem, clusterMeta, roomCount, roomFull, roomHelpers } from "../parts";

const MAX_LENGTH = 500;

export default function StudentTimelinePage() {
  const [answers, setAnswers] = useState<Partial<Record<string, Level>>>(me.answers);
  const [helping, setHelping] = useState<string[]>(me.helperConceptIds);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [joined, setJoined] = useState<string[]>(["r1"]);
  const [unread, setUnread] = useState(2);
  const [draft, setDraft] = useState("");
  const [askAbout, setAskAbout] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [sent, setSent] = useState<{ conceptId: string; content: string }[]>([]);

  const shownId = viewingId ?? activeConceptId;
  const shown = conceptById[shownId];
  const revisiting = shownId !== activeConceptId;
  const composerConceptId = askAbout ?? activeConceptId;
  const trimmed = draft.trim();
  const topicItems = concepts.map((c) => ({ value: c._id, label: c._id === activeConceptId ? `${c.label} (current topic)` : c.label }));

  const setLevel = (conceptId: string, level: Level) => setAnswers((a) => ({ ...a, [conceptId]: level }));
  const toggleHelp = (conceptId: string, on: boolean) =>
    setHelping((h) => (on ? [...new Set([...h, conceptId])] : h.filter((id) => id !== conceptId)));

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    setSent((s) => [...s, { conceptId: composerConceptId, content: trimmed }]);
    setDraft("");
    setComposing(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      {/* Pinned: identity strip + the one card that matters right now. */}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <Brand />
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="font-mono tracking-widest">
              {session.code}
            </Badge>
            <YourAnswersSheet answers={answers} helping={helping} onLevel={setLevel} onHelp={toggleHelp} />
          </div>
        </div>

        <section
          aria-label={revisiting ? `Revisiting ${shown.label}` : `Current topic: ${shown.label}`}
          className={cn(
            "mx-3 rounded-xl border-2 bg-card px-4 pt-3 pb-4 transition-colors",
            revisiting ? "border-border" : "border-primary",
          )}
        >
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold tracking-wide uppercase">
            {revisiting ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Undo2 className="size-3.5" aria-hidden />
                Revisiting · {shown.order} of {concepts.length}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-primary">
                <span className="relative flex size-2" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                Now · {shown.order} of {concepts.length}
              </span>
            )}
            {revisiting ? (
              <Button size="xs" variant="outline" onClick={() => setViewingId(null)}>
                <Pin data-icon="inline-start" aria-hidden />
                Back to now
              </Button>
            ) : (
              <span className="font-mono text-muted-foreground tabular-nums normal-case">since 10:49</span>
            )}
          </div>
          <h1 className="mt-1 text-2xl leading-tight font-semibold tracking-tight">{shown.label}</h1>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{shown.description}</p>
          <div className="mt-3">
            <ConfidenceSelector value={answers[shownId] ?? null} onChange={(level) => setLevel(shownId, level)} />
          </div>
          {answers[shownId] === "can_explain" && (
            <label
              className={cn(
                "enter mt-2.5 flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                helping.includes(shownId) ? "border-teal-300 bg-teal-50 text-teal-950" : "border-border bg-background",
              )}
            >
              <Checkbox
                className="mt-0.5"
                checked={helping.includes(shownId)}
                onCheckedChange={(v) => toggleHelp(shownId, v === true)}
              />
              <span>
                <span className="font-medium">I could help classmates with {shown.label}</span>
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  Your own call, not a test. Nobody is enrolled automatically; you appear only as{" "}
                  <span className="font-medium text-foreground">{me.alias}</span> in rooms you choose to join, and you can untick any time.
                </span>
              </span>
            </label>
          )}
        </section>

        <ol className="mx-3 mt-2.5 mb-2.5 grid grid-cols-6 gap-1" aria-label="Lecture progress: one segment per concept">
          {concepts.map((c) => {
            const lvl = LEVELS.find((l) => l.value === answers[c._id]);
            const isNow = c._id === activeConceptId;
            const covered = c.order <= conceptById[activeConceptId].order;
            return (
              <li key={c._id}>
                <button
                  type="button"
                  onClick={() => setViewingId(isNow ? null : c._id)}
                  aria-current={isNow ? "step" : undefined}
                  aria-pressed={shownId === c._id}
                  aria-label={`${c.label}: ${lvl ? lvl.label : "not answered"}${isNow ? ", current topic" : covered ? "" : ", coming up"}`}
                  className={cn(
                    "pressable block w-full rounded-md py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    shownId === c._id ? "bg-foreground/8" : "hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full",
                      lvl ? lvl.color : covered ? "bg-border" : "border border-dashed border-border bg-transparent",
                      isNow && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                    )}
                    aria-hidden
                  />
                  <span className="mt-1 block truncate text-center text-[10px] leading-none text-muted-foreground" aria-hidden>
                    {c.order}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </header>

      {/* The lecture so far: oldest first, newest just above the composer, like a chat. */}
      <ol className="flex-1 px-3 pt-5" aria-label="Lecture timeline">
        {studentEvents.map((ev, i) => {
          const isNew = ev.at > studentSeenUntil;
          const prevNew = i > 0 && studentEvents[i - 1].at > studentSeenUntil;
          const divider = isNew && !prevNew ? <NewDivider key="new" label={`New since ${studentSeenUntil}`} /> : null;
          const style = { "--i": Math.min(i, 8) } as React.CSSProperties;
          const key = `${ev.kind}-${ev.at}-${i}`;
          if (ev.kind === "joined")
            return [
              divider,
              <TimelineItem key={key} time={ev.at} icon={<LogIn />} label="Session" style={style}>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{session.title}</span> opened · {concepts.length} concepts. You appear as{" "}
                  <span className="font-medium text-foreground">{me.alias}</span>, pseudonymous to classmates.
                </p>
              </TimelineItem>,
            ];
          if (ev.kind === "topic") {
            const c = conceptById[ev.conceptId];
            const isNow = c._id === activeConceptId;
            return [
              divider,
              <TimelineItem key={key} time={ev.at} tone="topic" icon={<Pin />} label={isNow ? "Topic · now" : "Topic"} isNew={isNew} style={style}>
                {isNow ? (
                  <p className="text-sm text-muted-foreground">
                    Moved on to <span className="font-medium text-foreground">{c.label}</span> — pinned above.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setViewingId(c._id)}
                    className="pressable flex w-full items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.label}</span>
                      <LevelChip level={answers[c._id]} className="mt-0.5 text-muted-foreground" />
                      {helping.includes(c._id) && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-teal-800">
                          <HandHelping className="size-3" aria-hidden /> helping
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">Change</span>
                  </button>
                )}
              </TimelineItem>,
            ];
          }
          if (ev.kind === "asked") {
            const grouped = ev.clusterId ? clusterById[ev.clusterId] : null;
            return [
              divider,
              <TimelineItem key={key} time={ev.at} tone="me" icon={<Send />} label={`You asked · ${conceptLabel(ev.conceptId)}`} style={style}>
                <div className="rounded-lg rounded-tl-sm bg-foreground px-3 py-2 text-sm text-background">
                  <p>{ev.content}</p>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {grouped ? (
                    <>
                      <CheckCircle2 className="size-3.5 text-teal-700" aria-hidden />
                      Grouped into “{grouped.title}” (published {grouped.publishedAt})
                    </>
                  ) : (
                    "Sent anonymously · only your instructor can read it"
                  )}
                </p>
              </TimelineItem>,
            ];
          }
          if (ev.kind === "cluster") {
            const c = clusterById[ev.clusterId];
            return [
              divider,
              <TimelineItem key={key} time={ev.at} tone="cluster" icon={<MessagesSquare />} label="The class is asking" isNew={isNew} style={style}>
                <div className="rounded-lg border bg-card px-3 py-2.5">
                  <h2 className="font-heading font-medium">{c.title}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{c.summary}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
                    <ConceptChips ids={c.conceptIds} activeId={activeConceptId} />
                    <span>{clusterMeta(c)}</span>
                  </p>
                </div>
              </TimelineItem>,
            ];
          }
          const r = roomById[ev.roomId];
          const cluster = r.clusterId ? clusterById[r.clusterId] : null;
          const member = joined.includes(r._id);
          const asHelper = helping.includes(r.conceptId);
          const full = roomFull(r);
          return [
            divider,
            <TimelineItem key={key} time={ev.at} tone="room" icon={<DoorOpen />} label="Help room opened" isNew={isNew} style={style}>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50/70 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="tabular-nums">{roomCount(r)} in room</span> · {roomHelpers(r)} helper{roomHelpers(r) === 1 ? "" : "s"}
                    {cluster && <> · for “{cluster.title}”</>}
                  </p>
                </div>
                {member ? (
                  <Button size="sm" className="shrink-0">
                    Open
                    <ArrowRight data-icon="inline-end" aria-hidden />
                  </Button>
                ) : full ? (
                  <Badge variant="secondary" className="shrink-0">
                    Full
                  </Badge>
                ) : (
                  <Button size="sm" variant="outline" className="shrink-0 bg-card" onClick={() => setJoined((j) => [...j, r._id])}>
                    {asHelper ? "Join as helper" : "Join"}
                  </Button>
                )}
              </div>
            </TimelineItem>,
          ];
        })}
        {sent.map((q, i) => (
          <TimelineItem key={`sent-${i}`} time={session.now} tone="me" icon={<Send />} label={`You asked · ${conceptLabel(q.conceptId)}`}>
            <div className="rounded-lg rounded-tl-sm bg-foreground px-3 py-2 text-sm text-background">
              <p>{q.content}</p>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-teal-700" aria-hidden />
              Sent to your instructor. It stays private until they publish a group that includes it.
            </p>
          </TimelineItem>
        ))}
      </ol>

      {unread > 0 && (
        <div className="pointer-events-none sticky bottom-28 z-10 flex justify-center">
          <Button size="sm" className="pointer-events-auto" onClick={() => setUnread(0)} aria-live="polite">
            <ArrowDown data-icon="inline-start" aria-hidden />
            {unread} new since you last looked
          </Button>
        </div>
      )}

      {/* Persistent composer: one thumb, always about the pinned topic unless you say otherwise. */}
      <form onSubmit={send} className="sticky bottom-0 z-20 border-t bg-background/95 px-3 pt-2.5 pb-3 backdrop-blur supports-backdrop-filter:bg-background/85">
        {composing && (
          <label className="enter mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            Question about
            <Select items={topicItems} value={composerConceptId} onValueChange={(v) => v && setAskAbout(v)}>
              <SelectTrigger size="sm" aria-label="Question topic" className="max-w-56 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {topicItems.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onFocus={() => setComposing(true)}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            rows={composing ? 3 : 1}
            maxLength={MAX_LENGTH}
            placeholder={`Ask about ${conceptLabel(composerConceptId)}…`}
            aria-label={`Ask an anonymous question about ${conceptLabel(composerConceptId)}`}
            className="min-h-10 flex-1 resize-none rounded-2xl"
          />
          <Button type="submit" size="icon-lg" disabled={!trimmed} aria-label="Send anonymously">
            <Send aria-hidden />
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          {composing ? (
            <>
              <span className="tabular-nums">{draft.length}/{MAX_LENGTH}</span> · Optional. Classmates never see who asked; your instructor sees it under{" "}
              <span className="font-medium text-foreground">{me.alias}</span>, not your name, and operators could still link it to your device
              (pseudonymous, not fully anonymous). Text is sent to Claude (Anthropic) to group similar questions — no names or personal details.
            </>
          ) : (
            <>Anonymous to classmates · pseudonymous to your instructor · grouped by Claude. Tap to see the full note.</>
          )}
        </p>
      </form>
    </main>
  );
}

function YourAnswersSheet({
  answers,
  helping,
  onLevel,
  onHelp,
}: {
  answers: Partial<Record<string, Level>>;
  helping: string[];
  onLevel: (conceptId: string, level: Level) => void;
  onHelp: (conceptId: string, on: boolean) => void;
}) {
  const answered = concepts.filter((c) => answers[c._id]).length;
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        {me.alias}
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">
          {answered}/{concepts.length}
        </Badge>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl pb-6">
        <SheetHeader>
          <SheetTitle>All six concepts</SheetTitle>
          <SheetDescription>
            Text alternative to the progress strip. Change any answer here; tick the ones you could help classmates with. Only your own answers are
            shown — the class totals stay with your instructor.
          </SheetDescription>
        </SheetHeader>
        <ul className="space-y-4 px-4">
          {concepts.map((c) => (
            <li key={c._id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">
                  {c.order}. {c.label}
                </h3>
                {c._id === activeConceptId && <Badge>Current topic</Badge>}
              </div>
              <ConfidenceSelector value={answers[c._id] ?? null} onChange={(l) => onLevel(c._id, l)} />
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox checked={helping.includes(c._id)} onCheckedChange={(v) => onHelp(c._id, v === true)} />I could help with {c.label}
              </label>
            </li>
          ))}
        </ul>
        <p className="px-4 text-xs leading-relaxed text-muted-foreground">
          Helping is self-declared, not a rating. Nobody is enrolled or contacted automatically; you appear only as{" "}
          <span className="font-medium text-foreground">{me.alias}</span> in rooms you open or join, and you can untick at any time.
        </p>
      </SheetContent>
    </Sheet>
  );
}
