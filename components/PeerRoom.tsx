"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, SendHorizonal } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { studentTokenKey, useStoredCredential } from "@/lib/credentials";
import { Brand } from "@/components/Brand";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { InlineError } from "@/components/InlineError";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/errors";
import { PHASE_LABEL, type Level } from "@/lib/levels";
import { cn } from "@/lib/utils";

const CHECK_INS: { level: Level; label: string; className: string }[] = [
  { level: "can_explain", label: "I understand now", className: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { level: "confused", label: "Still confused", className: "bg-red-500 text-white hover:bg-red-600" },
];

export function PeerRoom() {
  const roomId = useParams<{ roomId: string }>().roomId as Id<"rooms">;
  const code = (useSearchParams().get("code") ?? "").toUpperCase();
  const token = useStoredCredential(code ? studentTokenKey(code) : "classpulse:none", false);

  const room = useQuery(api.rooms.get, token ? { roomId, token } : "skip");
  const messages = useQuery(api.messages.listByRoom, token ? { roomId, token } : "skip");
  const send = useMutation(api.messages.send);
  const leave = useMutation(api.rooms.leave);
  const close = useMutation(api.rooms.close);
  const upsert = useMutation(api.signals.upsert);
  const router = useRouter();

  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState<{ level: Level; phase: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  if (!code || token === null)
    return (
      <Gate
        text="You need to join the session on this device before entering a help room."
        href={code ? `/join/${code}` : "/"}
        cta={code ? `Join session ${code}` : "Go to the start page"}
      />
    );
  if (room === undefined || token === undefined) return <PageSkeleton />;
  if (room === null)
    return (
      <Gate
        text="You're not a member of this room (or it no longer exists). Join it from your session page."
        href={`/join/${code}`}
        cta={`Back to session ${code}`}
      />
    );

  const open = room.status === "open" && room.sessionState === "open";
  const checkedIn = checkIn?.phase === room.phase ? checkIn.level : null;

  async function guard(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function onSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    guard(async () => {
      await send({ roomId, token: token!, body });
      setDraft("");
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4 pb-12">
      <header className="enter space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Brand />
          <Button variant="ghost" size="sm" render={<Link href={`/join/${code}`} />}>
            <ArrowLeft data-icon="inline-start" aria-hidden />
            Back to session {code}
          </Button>
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{room.title}</h1>
            {!open && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                closed
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Help room · {room.conceptLabel} · <span className="tabular-nums">{room.members.length} / {room.capacity}</span>
            {room.clusterTitle && <> · for cluster “{room.clusterTitle}”</>}
          </p>
          <p className="text-sm text-muted-foreground">{room.conceptDescription}</p>
        </div>
        <ConnectionStatus />
      </header>

      <section className="grid gap-4 md:grid-cols-[14rem_1fr]">
        <Card size="sm" aria-labelledby="members" className="h-fit">
          <CardHeader>
            <CardTitle id="members" render={<h2 />}>In this room</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-1.5">
              {room.members.map((m, i) => (
                <li key={i} className="flex flex-wrap items-center gap-1.5">
                  <span className={m.isMe ? "font-semibold" : ""}>{m.alias}</span>
                  <Badge variant="secondary" className={cn(m.role === "helper" && "bg-emerald-100 text-emerald-900")}>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  guard(async () => {
                    await leave({ roomId, token: token! });
                    router.push(`/join/${code}`);
                  })
                }
              >
                Leave room
              </Button>
              {room.myRole === "helper" && open && (
                <Button variant="destructive" size="sm" onClick={() => guard(() => close({ roomId, token: token! }))}>
                  Close room
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <div className="flex-1 space-y-2 overflow-y-auto p-4" style={{ maxHeight: "24rem", minHeight: "16rem" }} aria-live="polite">
            {messages === undefined ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="ml-auto h-10 w-1/2" />
              </div>
            ) : messages === null || messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hi and describe where you got stuck.</p>
            ) : (
              messages.map((m) => (
                <div key={m._id} className={cn("enter flex", m.isMine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                      m.isMine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground",
                    )}
                  >
                    <p className={cn("mb-0.5 text-[11px] font-medium", m.isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {m.isMine ? "You" : m.authorAlias}
                      {m.authorIsSimulated && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-900">simulated</span>}
                    </p>
                    <p className="break-words whitespace-pre-wrap">{m.body}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={onSend} className="flex gap-2 border-t bg-muted/40 p-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              disabled={!open}
              placeholder={open ? "Message the room (max 500 chars)" : "Room is closed"}
              aria-label="Message"
              className="h-9 bg-background"
            />
            <Button type="submit" size="icon-lg" disabled={!open || !draft.trim()} aria-label="Send">
              <SendHorizonal aria-hidden />
            </Button>
          </form>
        </Card>
      </section>

      <Card aria-labelledby="check-in">
        <CardHeader>
          <CardTitle id="check-in" render={<h2 />}>
            How is <span className="underline decoration-foreground/30 underline-offset-4">{room.conceptLabel}</span> going now?
          </CardTitle>
          <CardDescription>
            This updates your self-reported understanding for the <span className="font-medium text-foreground">{PHASE_LABEL[room.phase]}</span>{" "}
            phase. Only aggregate counts are shown to the instructor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {CHECK_INS.map((c) => (
              <Button
                key={c.level}
                size="lg"
                disabled={room.sessionState !== "open"}
                aria-pressed={checkedIn === c.level}
                onClick={() =>
                  guard(async () => {
                    await upsert({ sessionId: room.sessionId, token: token!, conceptId: room.conceptId, level: c.level });
                    setCheckIn({ level: c.level, phase: room.phase });
                  })
                }
                className={cn(c.className, checkedIn === c.level && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
              >
                {checkedIn === c.level && <CheckCircle2 data-icon="inline-start" aria-hidden />}
                {c.label}
              </Button>
            ))}
          </div>
          {checkedIn && (
            <p className="enter text-sm text-emerald-700">Recorded under “{PHASE_LABEL[room.phase]}”. You can change it any time.</p>
          )}
        </CardContent>
      </Card>
      <InlineError message={error} />
    </main>
  );
}

function Gate({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <Brand />
      <p className="text-muted-foreground">{text}</p>
      <Button render={<Link href={href} />}>{cta}</Button>
    </main>
  );
}
