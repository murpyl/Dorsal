"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { ArrowLeft, CheckCircle2, SendHorizonal, Users } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { PHASE_LABEL, type Level } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { type Message, type Room, conceptById, messages as fixtureMessages, rooms, session } from "../fixtures";

const CHECK_INS: { level: Level; label: string; className: string }[] = [
  { level: "can_explain", label: "I understand now", className: "bg-teal-700 text-white hover:bg-teal-800" },
  { level: "confused", label: "Still confused", className: "bg-rose-600 text-white hover:bg-rose-700" },
];
const STUDENT_HREF = "/mock/projector/student";

export default function RoomProjectorMockPage() {
  return (
    <Suspense fallback={null}>
      <RoomProjectorMock />
    </Suspense>
  );
}

/** `?room=<id>` opens a fixture room; `?concept=<id>` opens a fresh room the student just created as helper. */
function resolveRoom(params: URLSearchParams): { room: Room; messages: Message[] } {
  const conceptId = params.get("concept");
  if (conceptId && conceptById[conceptId]) {
    return {
      room: {
        _id: `new-${conceptId}`,
        title: conceptById[conceptId].label,
        conceptId,
        clusterId: null,
        capacity: 6,
        members: [{ alias: session.me.alias, role: "helper", isMe: true }],
        isMember: true,
        myRole: "helper",
      },
      messages: [],
    };
  }
  const room = rooms.find((r) => r._id === params.get("room")) ?? rooms[0];
  return {
    room: room.isMember ? room : { ...room, isMember: true, myRole: "learner", members: [...room.members, { alias: session.me.alias, role: "learner", isMe: true }] },
    messages: room._id === rooms[0]._id ? fixtureMessages : [],
  };
}

function RoomProjectorMock() {
  const resolved = resolveRoom(useSearchParams());
  const room = resolved.room;
  const concept = conceptById[room.conceptId];
  const [messages, setMessages] = useState<Message[]>(resolved.messages);
  const [draft, setDraft] = useState("");
  const [checkedIn, setCheckedIn] = useState<Level | null>(null);
  const [changing, setChanging] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const helpers = room.members.filter((m) => m.role === "helper").length;

  function onSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setMessages((ms) => [...ms, { _id: `m${ms.length + 1}`, alias: session.me.alias, isMine: true, body, at: "10:34" }]);
    setDraft("");
  }

  const showPrompt = checkedIn === null || changing;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-5xl flex-col p-3 sm:p-4">
      <header className="enter flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="outline" size="icon-sm" nativeButton={false} render={<Link href={STUDENT_HREF} aria-label={`Back to session ${session.code}`} />}>
            <ArrowLeft aria-hidden />
          </Button>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              Help room · <span className="font-medium text-foreground">{concept.label}</span>
              {room.clusterId && <> · for “{room.title}”</>}
            </p>
            <h1 className="truncate font-heading text-xl font-semibold tracking-tight sm:text-2xl">{room.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="md:hidden"
            aria-expanded={membersOpen}
            aria-controls="room-members"
            onClick={() => setMembersOpen((o) => !o)}
          >
            <Users data-icon="inline-start" aria-hidden />
            {room.members.length} / {room.capacity}
          </Button>
          <Brand className="hidden sm:inline-flex" />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[15rem_1fr]">
        <Card size="sm" id="room-members" aria-labelledby="members" className={cn("h-fit", membersOpen ? "block" : "hidden md:flex")}>
          <CardHeader>
            <CardTitle id="members" render={<h2 />}>
              In this room · <span className="tabular-nums">{room.members.length} / {room.capacity}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-1.5">
              {room.members.map((m) => (
                <li key={m.alias} className="flex flex-wrap items-center gap-1.5">
                  <span className={m.isMe ? "font-semibold" : ""}>{m.alias}</span>
                  <Badge variant="secondary" className={cn(m.role === "helper" && "bg-teal-100 text-teal-900")}>
                    {m.role}
                  </Badge>
                  {m.isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {helpers} helper{helpers === 1 ? "" : "s"} volunteered for this topic themselves; it is not a verified credential.
            </p>
            <p className="text-xs text-muted-foreground">{concept.description}</p>
            <Separator />
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={STUDENT_HREF} />}>
                Leave room
              </Button>
              {room.myRole === "helper" && (
                <Button variant="destructive" size="sm">
                  Close room
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col gap-0 py-0">
          <section
            aria-labelledby="check-in"
            className={cn("border-b px-4 py-3 transition-colors", showPrompt ? "bg-accent" : "bg-muted/40")}
          >
            {showPrompt ? (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div>
                  <h2 id="check-in" className="font-heading text-base font-semibold">
                    How is <span className="underline decoration-foreground/30 underline-offset-4">{concept.label}</span> going now?
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Records under <span className="font-medium text-foreground">{PHASE_LABEL[session.phase]}</span>. Only aggregate counts reach the instructor.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CHECK_INS.map((c) => (
                    <Button
                      key={c.level}
                      size="lg"
                      aria-pressed={checkedIn === c.level}
                      onClick={() => {
                        setCheckedIn(c.level);
                        setChanging(false);
                      }}
                      className={cn(c.className, checkedIn === c.level && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
                    >
                      {checkedIn === c.level && <CheckCircle2 data-icon="inline-start" aria-hidden />}
                      {c.label}
                    </Button>
                  ))}
                  {changing && (
                    <Button size="lg" variant="ghost" onClick={() => setChanging(false)}>
                      Keep
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="enter flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" aria-live="polite">
                <CheckCircle2 className="size-4 text-teal-800" aria-hidden />
                <span>
                  <span id="check-in" className="font-medium">
                    {CHECK_INS.find((c) => c.level === checkedIn)?.label}
                  </span>{" "}
                  <span className="text-muted-foreground">recorded for {concept.label} under “{PHASE_LABEL[session.phase]}”.</span>
                </span>
                <Button size="xs" variant="ghost" onClick={() => setChanging(true)}>
                  Change
                </Button>
              </p>
            )}
          </section>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {room.myRole === "helper" ? "You opened this room. Say hi — classmates can join from their Help tab." : "No messages yet. Say hi and describe where you got stuck."}
              </p>
            )}
            {messages.map((m, i) => (
              <div key={m._id} className={cn("enter flex", m.isMine ? "justify-end" : "justify-start")} style={{ "--i": Math.min(i, 6) } as React.CSSProperties}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                    m.isMine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground",
                  )}
                >
                  <p className={cn("mb-0.5 flex items-baseline gap-2 text-[11px] font-medium", m.isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {m.isMine ? "You" : m.alias}
                    {!m.isMine && room.members.find((x) => x.alias === m.alias)?.role === "helper" && <span className="rounded bg-teal-100 px-1 text-teal-900">helper</span>}
                    <span className="ml-auto tabular-nums opacity-70">{m.at}</span>
                  </p>
                  <p className="break-words whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={onSend} className="flex gap-2 border-t bg-muted/40 p-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              placeholder="Message the room (max 500 chars)"
              aria-label="Message"
              className="h-11 bg-background text-base"
              autoFocus
            />
            <Button type="submit" size="icon-lg" className="size-11" disabled={!draft.trim()} aria-label="Send">
              <SendHorizonal aria-hidden />
            </Button>
          </form>
        </Card>
      </div>
      <p className="pt-2 text-center text-xs text-muted-foreground">
        You appear as <span className="font-medium text-foreground">{session.me.alias}</span> · messages are visible to room members only.
      </p>
    </div>
  );
}
