"use client";

import { type FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, SendHorizonal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { PHASE_LABEL, type Level } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { CLUSTERS, MESSAGES, ME, ROOMS, ROOM_MEMBERS, SESSION, conceptById, type Message } from "../fixtures";
import { Brand, MockBar } from "../parts";

const CHECK_INS: { level: Level; label: string; className: string }[] = [
  { level: "can_explain", label: "I understand now", className: "bg-teal-700 text-white hover:bg-teal-800" },
  { level: "confused", label: "Still confused", className: "bg-rose-600 text-white hover:bg-rose-700" },
];

export default function RoomDenseTable() {
  const room = ROOMS[0];
  const concept = conceptById(room.conceptId);
  const cluster = CLUSTERS.find((c) => c._id === room.clusterId) ?? null;
  const [messages, setMessages] = useState<Message[]>(MESSAGES);
  const [draft, setDraft] = useState("");
  const [checkedIn, setCheckedIn] = useState<Level | null>(null);
  const phase = "post" as const;

  function onSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setMessages((m) => [...m, { _id: `m${m.length + 1}`, kind: "chat", alias: ME.alias, isMine: true, body, at: SESSION.now }]);
    setDraft("");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MockBar screen="peer room" viewport="1024 × 768" />
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Brand />
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft data-icon="inline-start" aria-hidden />
            Session {SESSION.code}
          </Button>
          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            <h1 className="truncate text-lg font-semibold tracking-tight">{room.title}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {concept.label}
              {cluster && <> · for “{cluster.title}”</>} · <span className="tabular-nums">{room.memberCount} / {room.capacity}</span> · opened {room.openedAt}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {PHASE_LABEL[phase]}
            </Badge>
            <Button variant="outline" size="sm">
              Leave room
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-4 p-4 md:grid-cols-[1fr_17rem]">
        <section aria-label="Chat" className="flex min-h-[32rem] flex-col overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">Chat</span> · only members can read this
            </span>
            <span className="tabular-nums">{messages.filter((m) => m.kind === "chat").length} messages</span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
            {messages.map((m) =>
              m.kind === "system" ? (
                <p key={m._id} className="flex items-center gap-2 py-1 text-[11px] text-muted-foreground">
                  <span className="h-px flex-1 bg-border" aria-hidden />
                  <span className="shrink-0 text-center">
                    {m.body} <span className="tabular-nums opacity-70">{m.at}</span>
                  </span>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </p>
              ) : (
                <div key={m._id} className={cn("enter flex", m.isMine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                      m.isMine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground",
                    )}
                  >
                    <p className={cn("mb-0.5 flex items-baseline gap-2 text-[11px] font-medium", m.isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {m.isMine ? "You" : m.alias}
                      {!m.isMine && ROOM_MEMBERS.find((x) => x.alias === m.alias)?.role === "helper" && (
                        <span className="rounded bg-teal-100 px-1 text-teal-900">helper</span>
                      )}
                      <span className="ml-auto tabular-nums opacity-70">{m.at}</span>
                    </p>
                    <p className="break-words whitespace-pre-wrap">{m.body}</p>
                  </div>
                </div>
              ),
            )}
          </div>
          <form onSubmit={onSend} className="flex items-center gap-2 border-t bg-muted/40 p-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              placeholder="Message the room (max 500 chars)"
              aria-label="Message"
              className="h-9 bg-background"
            />
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              <Kbd>↵</Kbd> send
            </span>
            <Button type="submit" size="icon-lg" disabled={!draft.trim()} aria-label="Send">
              <SendHorizonal aria-hidden />
            </Button>
          </form>
        </section>

        <aside className="space-y-3 md:order-last">
          <section aria-labelledby="check-in" className="rounded-xl border border-primary/30 bg-accent/50 p-3">
            <h2 id="check-in" className="font-heading text-sm font-semibold">
              How is <span className="underline decoration-foreground/30 underline-offset-4">{concept.label}</span> going now?
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Records your <span className="font-medium text-foreground">{PHASE_LABEL[phase]}</span> answer. Your instructor only sees totals.
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2 md:grid-cols-1">
              {CHECK_INS.map((c) => (
                <Button
                  key={c.level}
                  size="lg"
                  aria-pressed={checkedIn === c.level}
                  onClick={() => setCheckedIn(c.level)}
                  className={cn("w-full", c.className, checkedIn === c.level && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
                >
                  {checkedIn === c.level && <CheckCircle2 data-icon="inline-start" aria-hidden />}
                  {c.label}
                </Button>
              ))}
            </div>
            {checkedIn && <p className="enter mt-2 text-xs text-teal-700">Recorded under “{PHASE_LABEL[phase]}”. You can change it any time.</p>}
          </section>

          <section aria-labelledby="members" className="rounded-xl border bg-card p-3 text-sm">
            <h2 id="members" className="flex items-baseline justify-between font-heading text-sm font-semibold">
              In this room
              <span className="text-xs font-normal tabular-nums text-muted-foreground">
                {room.memberCount} / {room.capacity}
              </span>
            </h2>
            <ul className="mt-2 space-y-1">
              {ROOM_MEMBERS.map((m) => (
                <li key={m.alias} className="flex items-center justify-between gap-2">
                  <span className={cn("truncate", m.isMe && "font-semibold")}>
                    {m.alias}
                    {m.isMe && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}
                  </span>
                  <Badge variant="secondary" className={cn(m.role === "helper" && "bg-teal-100 text-teal-900")}>
                    {m.role}
                  </Badge>
                </li>
              ))}
              <li className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="italic">1 seat free</span>
              </li>
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">Helpers volunteered for this topic themselves; it is not a verified credential.</p>
            <Separator className="my-3" />
            <h3 className="text-xs font-medium">{concept.label}</h3>
            <p className="text-xs text-muted-foreground">{concept.description}</p>
            {cluster && <p className="mt-1.5 text-xs text-muted-foreground">Room topic from the published group “{cluster.title}”.</p>}
          </section>
        </aside>
      </main>
    </div>
  );
}
