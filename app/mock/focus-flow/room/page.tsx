"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, SendHorizonal } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { PHASE_LABEL, type Level } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { clusters, conceptById, roomMembers, roomMessages, rooms, session, type Message } from "../fixtures";

const room = rooms[0];
const concept = conceptById(room.conceptId)!;
const cluster = clusters.find((k) => k._id === room.clusterId) ?? null;

const CHECK_INS: { level: Level; label: string; className: string }[] = [
  { level: "can_explain", label: "I understand now", className: "bg-teal-700 text-white hover:bg-teal-800" },
  { level: "confused", label: "Still confused", className: "bg-rose-600 text-white hover:bg-rose-700" },
];

export default function FocusFlowRoom() {
  const [messages, setMessages] = useState<Message[]>(roomMessages);
  const [draft, setDraft] = useState("");
  const [checkedIn, setCheckedIn] = useState<Level | null>(null);
  const [left, setLeft] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function onSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setMessages((m) => [...m, { _id: `m${m.length + 1}`, authorAlias: session.me.alias, body, isMine: true, time: "10:47" }]);
    setDraft("");
  }

  if (left)
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <Brand />
        <p className="text-muted-foreground">You left “{room.title}”. Your check-in, if any, is kept.</p>
        <Button nativeButton={false} render={<Link href="/mock/focus-flow/student" />}>
          Back to session {session.code}
        </Button>
      </main>
    );

  const checkIn = (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {CHECK_INS.map((c) => (
          <Button
            key={c.level}
            size="lg"
            aria-pressed={checkedIn === c.level}
            onClick={() => setCheckedIn(c.level)}
            className={cn("flex-1", c.className, checkedIn === c.level && "ring-2 ring-foreground ring-offset-2 ring-offset-card")}
          >
            {checkedIn === c.level && <CheckCircle2 data-icon="inline-start" aria-hidden />}
            {c.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {checkedIn ? (
          <span className="text-teal-700">Recorded under “{PHASE_LABEL[session.phase]}”. You can change it any time.</span>
        ) : (
          <>
            Updates your self-reported understanding for <span className="font-medium text-foreground">{PHASE_LABEL[session.phase]}</span>. Only
            aggregate counts reach the instructor.
          </>
        )}
      </p>
    </div>
  );

  return (
    <main className="mx-auto flex h-dvh w-full max-w-5xl flex-col gap-3 p-3 sm:p-4">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" nativeButton={false} render={<Link href="/mock/focus-flow/student" />} aria-label={`Back to session ${session.code}`}>
            <ArrowLeft aria-hidden />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{room.title}</h1>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <Badge variant="secondary">{concept.label}</Badge>
              <span className="tabular-nums">
                {roomMembers.length} / {room.capacity} in room
              </span>
              {cluster && <span className="hidden sm:inline">· for “{cluster.title}”</span>}
            </p>
          </div>
        </div>
        <Brand className="hidden sm:inline-flex" />
      </header>

      <section className="grid min-h-0 flex-1 gap-3 md:grid-cols-[1fr_17rem]">
        <Card className="flex min-h-0 flex-col gap-0 py-0">
          <div className="flex-1 space-y-2.5 overflow-y-auto p-4" aria-live="polite" aria-label="Messages">
            <p className="rounded-lg bg-muted/70 px-3 py-2 text-center text-xs text-muted-foreground">
              {concept.description} Helpers here volunteered themselves; nothing is verified.
            </p>
            {messages.map((m) => (
              <div key={m._id} className={cn("enter flex", m.isMine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                    m.isMine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground",
                  )}
                >
                  <p className={cn("mb-0.5 flex items-baseline gap-2 text-[11px] font-medium", m.isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {m.isMine ? "You" : m.authorAlias}
                    {roomMembers.find((x) => x.alias === m.authorAlias)?.role === "helper" && (
                      <span className="rounded-full bg-teal-100 px-1.5 text-teal-900">helper</span>
                    )}
                    <span className="tabular-nums opacity-70">{m.time}</span>
                  </p>
                  <p className="break-words whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="border-t bg-muted/40 p-3 md:hidden">
            <p className="mb-2 text-sm font-medium">How is {concept.label} going now?</p>
            {checkIn}
          </div>
          <form onSubmit={onSend} className="flex gap-2 border-t bg-muted/40 p-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              placeholder="Message the room (max 500 chars)"
              aria-label="Message"
              className="h-10 bg-background"
            />
            <Button type="submit" size="icon-lg" className="size-10" disabled={!draft.trim()} aria-label="Send">
              <SendHorizonal aria-hidden />
            </Button>
          </form>
        </Card>

        <div className="hidden min-h-0 flex-col gap-3 md:flex">
          <Card size="sm" aria-labelledby="check-in">
            <CardHeader>
              <CardTitle id="check-in" render={<h2 />}>
                How is <span className="underline decoration-foreground/30 underline-offset-4">{concept.label}</span> going now?
              </CardTitle>
            </CardHeader>
            <CardContent>{checkIn}</CardContent>
          </Card>
          <Card size="sm" aria-labelledby="members" className="min-h-0 flex-1 overflow-y-auto">
            <CardHeader>
              <CardTitle id="members" render={<h2 />}>
                In this room <span className="text-muted-foreground tabular-nums">{roomMembers.length} / {room.capacity}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="space-y-1.5">
                {roomMembers.map((m) => (
                  <li key={m.alias} className="flex flex-wrap items-center gap-1.5">
                    <span className={m.isMe ? "font-semibold" : ""}>{m.alias}</span>
                    <Badge variant="secondary" className={cn(m.role === "helper" && "bg-teal-100 text-teal-900")}>
                      {m.role}
                    </Badge>
                    {m.isSimulated && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                        simulated
                      </Badge>
                    )}
                    {m.isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Helpers volunteered for this topic themselves; it is not a verified credential.</p>
              <Separator />
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={() => setLeft(true)}>
                  Leave room
                </Button>
                <p className="text-xs text-muted-foreground">A helper or the instructor can close this room.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
