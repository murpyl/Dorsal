"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, SendHorizonal } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { PHASE_LABEL, type Level } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { CLUSTERS, MESSAGES, ROOMS, SESSION, conceptById, type Message } from "../fixtures";

const CHECK_INS: { level: Level; label: string; className: string }[] = [
  { level: "can_explain", label: "I understand now", className: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { level: "confused", label: "Still confused", className: "bg-red-500 text-white hover:bg-red-600" },
];

export default function ControlRoomPeerRoom() {
  const room = ROOMS[0];
  const concept = conceptById(room.conceptId);
  const cluster = CLUSTERS.find((k) => k._id === room.clusterId);
  const me = room.members.find((m) => m.isMe)!;
  const [messages, setMessages] = useState<Message[]>(MESSAGES);
  const [draft, setDraft] = useState("");
  const [checkedIn, setCheckedIn] = useState<Level | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const helpers = room.members.filter((m) => m.role === "helper").length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function onSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setMessages((ms) => [...ms, { _id: `m${Date.now()}`, authorAlias: me.alias, body, isMine: true, time: "now" }]);
    setDraft("");
  }

  return (
    <main className="mx-auto flex h-dvh min-h-[36rem] w-full max-w-6xl flex-col px-4 pt-4 pb-4 sm:px-6">
      <header className="enter flex flex-wrap items-start justify-between gap-3 pb-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Brand />
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/mock/control-room/student" />}>
              <ArrowLeft data-icon="inline-start" aria-hidden />
              Back to session {SESSION.code}
            </Button>
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{room.title}</h1>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-900">
                open
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Help room · {concept.label} · <span className="tabular-nums">{room.members.length} / {room.capacity}</span> · {helpers} helper
              {cluster && <> · for cluster “{cluster.title}”</>}
            </p>
          </div>
        </div>
        <div className="max-w-sm rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Goal:</span> {concept.description}
        </div>
      </header>

      <ul className="mb-3 flex gap-2 overflow-x-auto md:hidden" aria-label="Members">
        {room.members.map((m) => (
          <li key={m.alias} className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs", m.role === "helper" && "border-emerald-300 bg-emerald-50 text-emerald-950")}>
            {m.alias}
            {m.isMe && " (you)"}
          </li>
        ))}
      </ul>

      <section className="grid min-h-0 flex-1 gap-4 md:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col rounded-xl bg-card ring-1 ring-border/70 md:flex" aria-labelledby="members">
          <div className="px-4 pt-4 pb-2">
            <h2 id="members" className="font-heading font-medium">
              In this room
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {room.members.length} of {room.capacity} seats
            </p>
          </div>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 text-sm">
            {room.members.map((m) => (
              <li key={m.alias} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5", m.isMe && "bg-muted/70")}>
                <span className={cn("size-2 shrink-0 rounded-full", m.role === "helper" ? "bg-emerald-500" : "bg-primary")} aria-hidden />
                <span className={cn("min-w-0 flex-1 truncate", m.isMe && "font-semibold")}>
                  {m.alias}
                  {m.isMe && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}
                </span>
                <Badge variant="secondary" className={cn("text-[10px]", m.role === "helper" && "bg-emerald-100 text-emerald-900")}>
                  {m.role}
                </Badge>
              </li>
            ))}
            {Array.from({ length: room.capacity - room.members.length }).map((_, i) => (
              <li key={`empty-${i}`} className="flex items-center gap-2 rounded-lg border border-dashed px-2 py-1.5 text-xs text-muted-foreground">
                <span className="size-2 shrink-0 rounded-full border" aria-hidden />
                empty seat
              </li>
            ))}
          </ul>
          <div className="space-y-3 px-4 pt-3 pb-4">
            <p className="text-xs text-muted-foreground">Helpers volunteered for this topic themselves; it is not a verified credential. Simulated members are seeded demo data.</p>
            <Separator />
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/mock/control-room/student" />}>
                Leave room
              </Button>
              {me.role === "helper" ? (
                <Button variant="destructive" size="sm">
                  Close room
                </Button>
              ) : (
                <p className="text-[11px] text-muted-foreground">Only the helper or your instructor can close the room.</p>
              )}
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-border/70">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
            {messages.map((m) => (
              <div key={m._id} className={cn("enter flex", m.isMine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm", m.isMine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground")}>
                  <p className={cn("mb-0.5 flex items-baseline gap-2 text-[11px] font-medium", m.isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {m.isMine ? "You" : m.authorAlias}
                    {!m.isMine && room.members.find((x) => x.alias === m.authorAlias)?.role === "helper" && (
                      <span className="rounded bg-emerald-100 px-1 text-emerald-900">helper</span>
                    )}
                    <span className="font-normal tabular-nums opacity-70">{m.time}</span>
                  </p>
                  <p className="break-words whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <section className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t bg-primary/5 px-4 py-3" aria-labelledby="check-in">
            <div className="min-w-0 flex-1">
              <h2 id="check-in" className="font-heading text-[15px] font-medium">
                How is <span className="underline decoration-foreground/30 underline-offset-4">{concept.label}</span> going now?
              </h2>
              <p className="text-xs text-muted-foreground">
                Records your <span className="font-medium text-foreground">{PHASE_LABEL[SESSION.phase]}</span> answer. Only aggregates reach the instructor.
              </p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Check in">
              {CHECK_INS.map((c) => (
                <Button
                  key={c.level}
                  aria-pressed={checkedIn === c.level}
                  onClick={() => setCheckedIn(c.level)}
                  className={cn(c.className, checkedIn === c.level && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
                >
                  {checkedIn === c.level && <CheckCircle2 data-icon="inline-start" aria-hidden />}
                  {c.label}
                </Button>
              ))}
            </div>
            {checkedIn && (
              <p className="enter w-full text-xs text-emerald-700" role="status">
                Recorded under “{PHASE_LABEL[SESSION.phase]}”. You can change it any time.
              </p>
            )}
          </section>

          <form onSubmit={onSend} className="flex gap-2 border-t bg-muted/40 p-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              placeholder="Message the room (max 500 chars)"
              aria-label="Message"
              className="h-9 bg-background"
            />
            <Button type="submit" size="icon-lg" disabled={!draft.trim()} aria-label="Send">
              <SendHorizonal aria-hidden />
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
