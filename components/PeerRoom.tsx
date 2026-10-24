"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { studentTokenKey, useStoredCredential } from "@/lib/credentials";
import { errorMessage } from "@/lib/errors";
import type { Level } from "@/lib/levels";

const CHECK_INS: { level: Level; label: string; className: string }[] = [
  { level: "can_explain", label: "I understand now", className: "bg-emerald-600 hover:bg-emerald-700" },
  { level: "confused", label: "Still confused", className: "bg-red-500 hover:bg-red-600" },
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
      <main className="mx-auto max-w-xl space-y-3 p-8">
        <p className="text-zinc-700">You need to join the session on this device before entering a help room.</p>
        <Link href={code ? `/join/${code}` : "/"} className="font-medium text-indigo-700 underline">
          {code ? `Join session ${code}` : "Go to the start page"}
        </Link>
      </main>
    );
  if (room === undefined || token === undefined) return <p className="p-8 text-zinc-500">Opening room…</p>;
  if (room === null)
    return (
      <main className="mx-auto max-w-xl space-y-3 p-8">
        <p className="text-zinc-700">You&apos;re not a member of this room (or it no longer exists). Join it from your session page.</p>
        <Link href={`/join/${code}`} className="font-medium text-indigo-700 underline">
          Back to session {code}
        </Link>
      </main>
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
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4">
      <header className="space-y-1">
        <Link href={`/join/${code}`} className="text-sm text-indigo-700 underline">
          ← Back to session {code}
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold">{room.title}</h1>
          <p className="text-sm text-zinc-500">
            Help room · {room.conceptLabel} · {room.members.length} / {room.capacity}
            {!open && <span className="ml-2 font-medium text-amber-700">closed</span>}
          </p>
        </div>
        <p className="text-sm text-zinc-600">{room.conceptDescription}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-[14rem_1fr]">
        <aside className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm" aria-labelledby="members">
          <h2 id="members" className="font-medium">
            In this room
          </h2>
          <ul className="space-y-1">
            {room.members.map((m, i) => (
              <li key={i} className="flex flex-wrap items-center gap-1">
                <span className={m.isMe ? "font-semibold" : ""}>{m.alias}</span>
                <span className={`rounded px-1.5 text-xs ${m.role === "helper" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-700"}`}>
                  {m.role}
                </span>
                {m.isSimulated && <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">simulated</span>}
                {m.isMe && <span className="text-xs text-zinc-500">(you)</span>}
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">Helpers volunteered for this topic themselves; it is not a verified credential.</p>
          <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3">
            <button
              onClick={() =>
                guard(async () => {
                  await leave({ roomId, token: token! });
                  router.push(`/join/${code}`);
                })
              }
              className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50"
            >
              Leave room
            </button>
            {room.myRole === "helper" && open && (
              <button
                onClick={() => guard(() => close({ roomId, token: token! }))}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-50"
              >
                Close room
              </button>
            )}
          </div>
        </aside>

        <div className="flex flex-col rounded-xl border border-zinc-200 bg-white">
          <div className="flex-1 space-y-2 overflow-y-auto p-4" style={{ maxHeight: "24rem", minHeight: "16rem" }} aria-live="polite">
            {!messages || messages.length === 0 ? (
              <p className="text-sm text-zinc-500">No messages yet. Say hi and describe where you got stuck.</p>
            ) : (
              messages.map((m) => (
                <div key={m._id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.isMine ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-900"}`}>
                    <p className={`text-xs ${m.isMine ? "text-indigo-200" : "text-zinc-500"}`}>{m.isMine ? "You" : m.authorAlias}</p>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={onSend} className="flex gap-2 border-t border-zinc-200 p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              disabled={!open}
              placeholder={open ? "Message the room (max 500 chars)" : "Room is closed"}
              aria-label="Message"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button disabled={!open || !draft.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              Send
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4" aria-labelledby="check-in">
        <h2 id="check-in" className="font-medium">
          How is <span className="text-indigo-700">{room.conceptLabel}</span> going now?
        </h2>
        <p className="text-sm text-zinc-600">
          This updates your self-reported understanding for the session&apos;s <span className="font-medium">{room.phase}</span> phase. Only
          aggregate counts are shown to the instructor.
        </p>
        <div className="flex flex-wrap gap-2">
          {CHECK_INS.map((c) => (
            <button
              key={c.level}
              disabled={room.sessionState !== "open"}
              aria-pressed={checkedIn === c.level}
              onClick={() =>
                guard(async () => {
                  await upsert({ sessionId: room.sessionId, token: token!, conceptId: room.conceptId, level: c.level });
                  setCheckIn({ level: c.level, phase: room.phase });
                })
              }
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${c.className} ${checkedIn === c.level ? "ring-2 ring-offset-2 ring-zinc-800" : ""}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {checkedIn && <p className="text-sm text-emerald-700">Recorded under the {room.phase} phase. You can change it any time.</p>}
      </section>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </main>
  );
}
