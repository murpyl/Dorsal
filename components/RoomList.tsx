"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";

type Concept = { _id: Id<"concepts">; label: string };

export const roomHref = (roomId: Id<"rooms">, code: string) => `/room/${roomId}?code=${encodeURIComponent(code)}`;

export function RoomList({
  sessionId,
  token,
  code,
  concepts,
}: {
  sessionId: Id<"sessions">;
  token: string;
  code: string;
  concepts: Concept[];
}) {
  const router = useRouter();
  const rooms = useQuery(api.rooms.listBySession, { sessionId, token });
  const me = useQuery(api.participants.me, { sessionId, token });
  const createAsHelper = useMutation(api.rooms.createAsHelper);
  const join = useMutation(api.rooms.join);
  const [conceptId, setConceptId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!rooms || !me) return null;
  const helperConcepts = concepts.filter((c) => me.helperConceptIds.includes(c._id));
  const chosen = helperConcepts.find((c) => c._id === conceptId) ?? helperConcepts[0] ?? null;

  async function run(action: () => Promise<Id<"rooms">>) {
    setBusy(true);
    setError(null);
    try {
      router.push(roomHref(await action(), code));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4" aria-labelledby="help-rooms">
      <div>
        <h2 id="help-rooms" className="font-medium">
          Peer help rooms
        </h2>
        <p className="text-sm text-zinc-600">
          Small live chat rooms (max {rooms[0]?.capacity ?? 6} people) on one topic. Join only if you want to; you can leave any time.
        </p>
      </div>

      {chosen && (
        <form
          className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createAsHelper({ sessionId, token, conceptId: chosen._id }));
          }}
        >
          <label htmlFor="helper-room-concept" className="font-medium text-emerald-900">
            Open a help room as a helper for
          </label>
          <select
            id="helper-room-concept"
            value={chosen._id}
            onChange={(e) => setConceptId(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1"
          >
            {helperConcepts.map((c) => (
              <option key={c._id} value={c._id}>
                {c.label}
              </option>
            ))}
          </select>
          <button disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-1 font-medium text-white disabled:opacity-50">
            Open room
          </button>
        </form>
      )}

      {rooms.length === 0 ? (
        <p className="text-sm text-zinc-500">No open help rooms yet.</p>
      ) : (
        <ul className="space-y-2">
          {rooms.map((r) => {
            const full = r.memberCount >= r.capacity;
            const asHelper = me.helperConceptIds.includes(r.conceptId);
            return (
              <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 text-sm">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-zinc-600">
                    {r.conceptLabel} · {r.memberCount} / {r.capacity} in room · {r.helperCount} helper{r.helperCount === 1 ? "" : "s"}
                  </p>
                </div>
                {r.isMember ? (
                  <Link href={roomHref(r._id, code)} className="rounded-lg bg-indigo-600 px-3 py-1 font-medium text-white">
                    Open ({r.myRole})
                  </Link>
                ) : full ? (
                  <span className="rounded-lg bg-zinc-100 px-3 py-1 text-zinc-500">Full</span>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await join({ roomId: r._id, token, role: asHelper ? "helper" : "learner" });
                        return r._id;
                      })
                    }
                    className="rounded-lg border border-indigo-600 px-3 py-1 font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {asHelper ? "Join as helper" : "Join"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

export function RoomStatus({
  sessionId,
  instructorSecret,
  concepts,
}: {
  sessionId: Id<"sessions">;
  instructorSecret: string;
  concepts: Concept[];
}) {
  const rooms = useQuery(api.rooms.listInstructor, { sessionId, instructorSecret });
  const createForCluster = useMutation(api.rooms.createForCluster);
  const close = useMutation(api.rooms.close);
  const [conceptId, setConceptId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const chosen = concepts.find((c) => c._id === conceptId) ?? concepts[0] ?? null;

  async function guard(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4" aria-labelledby="room-status">
      <h2 id="room-status" className="font-medium">
        Help rooms (live)
      </h2>
      {chosen && (
        <form
          className="flex flex-wrap items-center gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            guard(() => createForCluster({ sessionId, instructorSecret, conceptId: chosen._id }));
          }}
        >
          <label htmlFor="instructor-room-concept">Open help room for</label>
          <select
            id="instructor-room-concept"
            value={chosen._id}
            onChange={(e) => setConceptId(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1"
          >
            {concepts.map((c) => (
              <option key={c._id} value={c._id}>
                {c.label}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-indigo-600 px-3 py-1 font-medium text-white hover:bg-indigo-700">Open help room</button>
        </form>
      )}
      {!rooms || rooms.length === 0 ? (
        <p className="text-sm text-zinc-500">No open rooms.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rooms.map((r) => (
            <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-zinc-600">
                  {r.conceptLabel} · <strong>{r.memberCount}</strong> / {r.capacity} members · {r.helperCount} helper
                  {r.helperCount === 1 ? "" : "s"}
                  {r.memberCount >= r.capacity && <span className="ml-2 text-amber-700">full</span>}
                </p>
              </div>
              <button
                onClick={() => guard(() => close({ roomId: r._id, instructorSecret }))}
                className="rounded-lg border border-zinc-300 px-3 py-1 hover:bg-zinc-50"
              >
                Close room
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
