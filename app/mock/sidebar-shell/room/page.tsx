"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronDown, SendHorizonal, Users, X } from "lucide-react";
import { Brand } from "@/components/Brand";
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
import { PHASE_LABEL, type Level } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { clusters, conceptById, me, roomMessages, rooms, session } from "../fixtures";
import { Avatar, MockBanner, relTime } from "../ui";

const CHECK_INS: { level: Level; label: string; className: string }[] = [
  { level: "can_explain", label: "I understand now", className: "bg-teal-700 text-white hover:bg-teal-800" },
  { level: "confused", label: "Still confused", className: "bg-rose-600 text-white hover:bg-rose-700" },
];

export default function RoomMock() {
  const room = rooms[0];
  const concept = conceptById(room.conceptId);
  const cluster = clusters.find((c) => c._id === room.clusterId) ?? null;
  const [messages, setMessages] = useState(roomMessages);
  const [draft, setDraft] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [checkIn, setCheckIn] = useState<Level | null>(null);
  const [bannerOpen, setBannerOpen] = useState(true);
  const helpers = room.members.filter((m) => m.role === "helper");
  const myRole = room.members.find((m) => m.isMe)?.role ?? "learner";

  function onSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setMessages((ms) => [...ms, { _id: `m${ms.length + 1}`, alias: me.alias, body, isMine: true, minutesAgo: 0 }]);
    setDraft("");
  }

  return (
    <div className="mx-auto flex h-screen w-full max-w-5xl flex-col">
      <MockBanner screen="Peer room · 1024 px" />
      <header className="border-b bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href="/mock/sidebar-shell/student" />} aria-label={`Back to session ${session.code}`}>
              <ArrowLeft aria-hidden />
            </Button>
            <Brand className="hidden sm:inline-flex" />
            <Separator orientation="vertical" className="hidden h-6 sm:block" />
            <div className="min-w-0">
              <h1 className="truncate font-heading text-lg leading-tight font-semibold">{room.title}</h1>
              <p className="truncate text-xs text-muted-foreground">
                Help room · <span className="font-medium text-foreground">{concept.label}</span>
                {cluster && <> · for cluster “{cluster.title}”</>}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMembersOpen((o) => !o)}
              aria-expanded={membersOpen}
              aria-controls="members-panel"
              className="pressable flex items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex -space-x-2">
                {room.members.map((m) => (
                  <Avatar key={m.alias} alias={m.alias} size="sm" className={cn(m.role === "helper" && "ring-2 ring-teal-500")} />
                ))}
              </span>
              <span className="tabular-nums">
                {room.members.length}/{room.capacity}
              </span>
              <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", membersOpen && "rotate-180")} aria-hidden />
            </button>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/mock/sidebar-shell/student" />}>
              Leave
            </Button>
            {myRole === "helper" && (
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>Close room</AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close this room?</AlertDialogTitle>
                    <AlertDialogDescription>Everyone keeps their check-ins, but nobody can chat here any more.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep open</AlertDialogCancel>
                    <AlertDialogAction variant="destructive">Close room</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col" aria-label="Chat">
          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
            <p className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              Room opened {relTime(room.openedMinutesAgo)} · {helpers.length} helper, {room.members.length - helpers.length} learners · helpers volunteered, not a verified credential
            </p>
            {messages.map((m, i) => {
              const member = room.members.find((x) => x.alias === m.alias);
              const first = i === 0 || messages[i - 1].alias !== m.alias;
              return (
                <div key={m._id} className={cn("enter flex items-end gap-2", m.isMine ? "justify-end" : "justify-start")}>
                  {!m.isMine && <Avatar alias={m.alias} size="sm" className={cn(!first && "invisible")} />}
                  <div className={cn("max-w-[72%] rounded-2xl px-3.5 py-2 text-sm", m.isMine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card ring-1 ring-border/70")}>
                    {first && (
                      <p className={cn("mb-0.5 flex items-center gap-1.5 text-[11px] font-medium", m.isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {m.isMine ? "You" : m.alias}
                        {member?.role === "helper" && <Badge variant="secondary" className="h-4 bg-teal-100 px-1.5 text-[10px] text-teal-900">helper</Badge>}
                        {member?.isSimulated && <span className="rounded bg-amber-100 px-1 text-amber-900">simulated</span>}
                      </p>
                    )}
                    <p className="break-words whitespace-pre-wrap">{m.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {bannerOpen && (
            <div className="border-t bg-accent/60 px-4 py-2.5" role="region" aria-label="Check-in">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="min-w-0 flex-1 text-sm">
                  <span className="font-heading font-semibold">How is {concept.label} going now?</span>
                  <span className="block text-xs text-muted-foreground">
                    Records your {PHASE_LABEL[session.phase].toLowerCase()} answer · only class totals reach the instructor
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  {CHECK_INS.map((c) => (
                    <Button
                      key={c.level}
                      size="sm"
                      aria-pressed={checkIn === c.level}
                      onClick={() => setCheckIn(c.level)}
                      className={cn(c.className, checkIn === c.level && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
                    >
                      {checkIn === c.level && <CheckCircle2 data-icon="inline-start" aria-hidden />}
                      {c.label}
                    </Button>
                  ))}
                  <Button variant="ghost" size="icon-sm" aria-label="Hide check-in" onClick={() => setBannerOpen(false)}>
                    <X aria-hidden />
                  </Button>
                </div>
              </div>
              {checkIn && <p className="enter mt-1 text-xs text-teal-800">Recorded under “{PHASE_LABEL[session.phase]}”. You can change it any time.</p>}
            </div>
          )}
          {!bannerOpen && (
            <button type="button" onClick={() => setBannerOpen(true)} className="border-t px-4 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground">
              {checkIn ? `Check-in recorded: ${CHECK_INS.find((c) => c.level === checkIn)!.label} · change` : `Check in on ${concept.label}`}
            </button>
          )}

          <form onSubmit={onSend} className="flex gap-2 border-t bg-card p-3">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} placeholder="Message the room (max 500 chars)" aria-label="Message" className="h-10 flex-1 bg-background text-base" />
            <Button type="submit" size="icon-lg" className="size-10" disabled={!draft.trim()} aria-label="Send">
              <SendHorizonal aria-hidden />
            </Button>
          </form>
        </section>

        <aside
          id="members-panel"
          hidden={!membersOpen}
          className="w-72 shrink-0 space-y-4 overflow-y-auto border-l bg-card p-4 text-sm max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:w-full max-md:border-t"
          aria-label="Members"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading font-semibold">
              <Users className="size-4 text-blahaj" aria-hidden /> In this room
            </h2>
            <Button variant="ghost" size="icon-xs" aria-label="Hide members" onClick={() => setMembersOpen(false)}>
              <X aria-hidden />
            </Button>
          </div>
          <ul className="space-y-2">
            {room.members.map((m) => (
              <li key={m.alias} className="flex items-center gap-2.5">
                <Avatar alias={m.alias} className={cn(m.role === "helper" && "ring-2 ring-teal-500")} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate", m.isMe && "font-semibold")}>
                    {m.alias} {m.isMe && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                  </span>
                  <span className="flex gap-1 text-[11px] text-muted-foreground">
                    {m.role}
                    {m.isSimulated && <span className="rounded bg-amber-100 px-1 text-amber-900">simulated</span>}
                  </span>
                </span>
              </li>
            ))}
            {Array.from({ length: room.capacity - room.members.length }).map((_, i) => (
              <li key={`free-${i}`} className="flex items-center gap-2.5 text-muted-foreground">
                <span className="size-8 rounded-full border-2 border-dashed" aria-hidden />
                <span className="text-xs">1 seat free</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Helpers volunteered for this topic themselves; it is not a verified credential.</p>
        </aside>
      </div>
    </div>
  );
}
