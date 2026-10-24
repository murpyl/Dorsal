"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, DoorOpen, HandHelping, SendHorizontal, Sparkles } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ConfidenceSelector } from "@/components/ConfidenceSelector";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LEVELS, type Level } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { clusterById, conceptById, me, messages as initialMessages, roomById, rooms, type Message, type Room } from "../fixtures";
import { LevelChip, MockNav, roomCount, roomFull, roomHelpers } from "../parts";

export default function RoomTimelinePage() {
  return (
    <Suspense>
      <RoomFromQuery />
    </Suspense>
  );
}

function RoomFromQuery() {
  const id = useSearchParams().get("room");
  return <RoomScreen key={id ?? "default"} room={(id && roomById[id]) || rooms[0]} />;
}

/** `room` comes from `?room=<id>` so the student feed can open whichever room was joined; r1 is the one the fixture student belongs to. */
function RoomScreen({ room }: { room: Room }) {
  const concept = conceptById[room.conceptId];
  const cluster = room.clusterId ? clusterById[room.clusterId] : null;
  const isHelper = room.members.some((m) => m.isMe && m.role === "helper");
  const before = me.answers[concept._id];
  const initialMsgs = room._id === "r1" ? initialMessages : [];
  const [msgs, setMsgs] = useState<Message[]>(initialMsgs);
  const [draft, setDraft] = useState("");
  const [left, setLeft] = useState(false);
  const [checkin, setCheckin] = useState<Level | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const roleOf = (alias: string) => room.members.find((m) => m.alias === alias)?.role;
  const endRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, checkin]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setMsgs((m) => [
      ...m,
      {
        _id: `m${Date.now()}`,
        alias: me.alias,
        body,
        at: "10:52",
        isMine: true,
      },
    ]);
    setDraft("");
  }

  if (left)
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <DoorOpen className="size-10 text-primary" aria-hidden />
        <h1 className="text-2xl font-semibold">You left {room.title}</h1>
        <p className="text-muted-foreground">Your check-in {checkin ? "was recorded" : "was skipped"}. The lecture timeline is where you left it.</p>
        <Button nativeButton={false} render={<Link href="/mock/timeline/student" />}>
          <ArrowLeft data-icon="inline-start" aria-hidden />
          Back to the lecture
        </Button>
        <MockNav />
      </main>
    );

  return (
    <main className="mx-auto flex h-dvh w-full max-w-6xl flex-col px-4 py-3 sm:px-6">
      <header className="flex items-center justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Back to the lecture" nativeButton={false} render={<Link href="/mock/timeline/student" />}>
            <ArrowLeft aria-hidden />
          </Button>
          <Brand />
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-medium leading-tight">{room.title}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {roomCount(room)} in room · {roomHelpers(room)} helpers · opened {room.openedAt} · you are{" "}
              <span className="font-medium text-foreground">{me.alias}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn("hidden tabular-nums sm:inline-flex", roomFull(room) && "bg-amber-100 text-amber-900")}>
            {roomFull(room) ? "Room full" : `${room.capacity - room.members.length} seat${room.capacity - room.members.length === 1 ? "" : "s"} left`}
          </Badge>
          <LeaveDialog conceptLabel={concept.label} hasCheckin={checkin !== null} onLeave={() => setLeft(true)} onCheckinFirst={() => setCheckinOpen(true)} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[18rem_1fr]">
        {/* Context column: why we are here, who is here, and the check-in. Always visible on laptop, stacked above chat on phone. */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto [scrollbar-width:thin] lg:pr-1" aria-label="Room context">
          <section className="rounded-2xl border bg-card p-4">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">This room is about</p>
            <h2 className="mt-1 font-heading text-lg leading-snug font-medium">{cluster ? cluster.title : concept.label}</h2>
            {cluster && <p className="mt-1 text-sm text-muted-foreground">{cluster.summary}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{concept.label}</Badge>
              {cluster && (
                <span className="text-xs text-muted-foreground">
                  {cluster.questionIds.length} questions · {cluster.helperCount} helpers opted in
                </span>
              )}
            </div>
          </section>

          <CheckinCard
            conceptLabel={concept.label}
            before={before}
            value={checkin}
            open={checkinOpen}
            onOpenChange={setCheckinOpen}
            onChange={(v) => {
              setCheckin(v);
              setCheckinOpen(false);
            }}
          />
          <section className="rounded-2xl border bg-card p-4" aria-labelledby="members">
            <div className="flex items-center justify-between">
              <h2 id="members" className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                In the room
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">{roomCount(room)}</span>
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {room.members.map((m) => (
                <li key={m.alias}>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                      m.role === "helper" ? "border-teal-200 bg-teal-50 text-teal-900" : "bg-background",
                      m.isMe && "border-primary font-medium",
                    )}
                  >
                    {m.role === "helper" && <HandHelping className="size-3.5" aria-hidden />}
                    {m.alias}
                    {m.isMe && <span className="text-muted-foreground">(you)</span>}
                    <span className="sr-only">, {m.role}</span>
                  </span>
                </li>
              ))}
              {Array.from({ length: room.capacity - room.members.length }).map((_, i) => (
                <li key={`empty-${i}`} className="inline-flex items-center rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground">
                  open seat
                </li>
              ))}
            </ul>
            <p className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <HandHelping className="size-3 text-teal-800" aria-hidden /> helper
              </span>
              <span>plain = learner</span>
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Aliases are per session. Nobody here can see who you are; the instructor sees aliases, not names.
            </p>
          </section>
        </aside>

        {/* Chat column: the room's own timeline. The check-in prompt lands here as an event after a few minutes, the same way it does in the lecture feed. */}
        <section className="flex min-h-0 flex-col rounded-2xl border bg-card" aria-label="Room chat">
          <ol className="flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-width:thin]" aria-live="polite" aria-relevant="additions">
            <li className="text-center text-xs text-muted-foreground">
              Room opened {room.openedAt} by the instructor for &ldquo;
              {cluster?.title ?? concept.label}&rdquo;
            </li>
            {msgs.map((m, i) => {
              const role = roleOf(m.alias);
              const prevSame = i > 0 && msgs[i - 1].alias === m.alias;
              return (
                <li key={m._id} className={cn("flex flex-col gap-0.5", m.isMine ? "items-end" : "items-start", prevSame && "-mt-1.5")}>
                  {!prevSame && (
                    <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                      <span className={cn("font-medium", role === "helper" ? "text-teal-800" : "text-foreground")}>{m.isMine ? "you" : m.alias}</span>
                      {role === "helper" && !m.isMine && (
                        <Badge variant="secondary" className="h-4 bg-teal-100 px-1 text-[10px] text-teal-900">
                          helper
                        </Badge>
                      )}
                      <span className="tabular-nums">{m.at}</span>
                    </p>
                  )}
                  <p
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap",
                      m.isMine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-background",
                    )}
                  >
                    {m.body}
                  </p>
                </li>
              );
            })}
            {!checkin && (
              <li className="enter">
                <div className="mx-auto max-w-md rounded-2xl border border-primary/40 bg-primary/5 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <Sparkles className="size-4 text-primary" aria-hidden />
                    Quick check-in · 10:52
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    You have been here a few minutes. How is <span className="font-medium text-foreground">{concept.label}</span> going now?
                  </p>
                  <div className="mt-2">
                    <ConfidenceSelector value={null} onChange={setCheckin} />
                  </div>
                </div>
              </li>
            )}
            {checkin && (
              <li className="text-center text-xs text-muted-foreground">
                <Check className="mr-1 inline size-3.5 text-teal-700" aria-hidden />
                You checked in: <LevelChip level={checkin} className="align-middle" /> — recorded as an after-help signal. Thanks!
              </li>
            )}
            <li ref={endRef} aria-hidden />
          </ol>
          <form onSubmit={send} className="flex items-center gap-2 border-t p-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={isHelper ? "Explain, ask a leading question, or share an example…" : "Ask the helpers anything…"}
              maxLength={500}
              aria-label="Message"
              className="h-11 flex-1 rounded-full bg-background px-4"
            />
            <Button type="submit" size="icon-lg" className="rounded-full" aria-label="Send" disabled={!draft.trim()}>
              <SendHorizontal aria-hidden />
            </Button>
          </form>
        </section>
      </div>
      <p className="pt-2 text-center text-[11px] text-muted-foreground">
        Be kind; chat is visible to everyone in this room and to the instructor. Leaving is instant — your check-in is the only thing that is recorded.
      </p>
    </main>
  );
}

function CheckinCard({
  conceptLabel,
  before,
  value,
  open,
  onOpenChange,
  onChange,
}: {
  conceptLabel: string;
  before: Level | undefined;
  value: Level | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChange: (v: Level) => void;
}) {
  const l = LEVELS.find((x) => x.value === value);
  return (
    <section className={cn("rounded-2xl border p-4", value ? "border-teal-200 bg-teal-50/60" : "border-primary/40 bg-primary/5")} aria-labelledby="checkin">
      <h2 id="checkin" className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        Check-in · after help
      </h2>
      {value && l ? (
        <>
          <p className="mt-1 text-sm">
            <Check className="mr-1 inline size-4 text-teal-700" aria-hidden />
            {conceptLabel}: <strong>{l.label}</strong>
            {before && before !== value && (
              <span className="text-muted-foreground">
                {" "}
                (was <LevelChip level={before} className="align-middle" />)
              </span>
            )}
          </p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => onOpenChange(true)}>
            Change
          </Button>
          {open && (
            <div className="mt-2">
              <ConfidenceSelector value={value} onChange={onChange} />
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 text-sm">
            How is <strong>{conceptLabel}</strong> going now?
          </p>
          {before && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Before help you said <LevelChip level={before} className="align-middle" />.
            </p>
          )}
          <div className="mt-2">
            <ConfidenceSelector value={null} onChange={onChange} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Counted in the instructor&rsquo;s before/after view, never shown with your alias.</p>
        </>
      )}
    </section>
  );
}

function LeaveDialog({
  conceptLabel,
  hasCheckin,
  onLeave,
  onCheckinFirst,
}: {
  conceptLabel: string;
  hasCheckin: boolean;
  onLeave: () => void;
  onCheckinFirst: () => void;
}) {
  if (hasCheckin)
    return (
      <Button variant="outline" onClick={onLeave}>
        Leave room
      </Button>
    );
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>Leave room</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Check in before you go?</AlertDialogTitle>
          <AlertDialogDescription>
            A one-tap answer to &ldquo;How is {conceptLabel} going now?&rdquo; tells your instructor whether peer help worked. It is anonymous and optional.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onLeave}>Leave without it</AlertDialogCancel>
          <AlertDialogAction onClick={onCheckinFirst}>Check in first</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
