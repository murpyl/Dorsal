"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RoomJoinButton, roomHref, roomSummary } from "@/components/RoomList";
import { errorMessage } from "@/lib/errors";

export function PublishedClusters({
  sessionId,
  token,
  code,
  concepts,
}: {
  sessionId: Id<"sessions">;
  token: string;
  code: string;
  concepts: { _id: Id<"concepts">; label: string }[];
}) {
  const router = useRouter();
  const clusters = useQuery(api.clusters.listPublished, { sessionId, token });
  const rooms = useQuery(api.rooms.listBySession, { sessionId, token });
  const me = useQuery(api.participants.me, { sessionId, token });
  const createAsHelper = useMutation(api.rooms.createAsHelper);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openRoom(clusterId: Id<"clusters">, conceptId: Id<"concepts">) {
    setBusy(true);
    setError(null);
    try {
      router.push(roomHref(await createAsHelper({ sessionId, token, conceptId, clusterId }), code));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4" aria-labelledby="published-clusters">
      <h2 id="published-clusters" className="font-medium">
        What the class is asking
      </h2>
      <p className="text-xs text-zinc-500">Groups of pseudonymous questions your instructor has reviewed and published.</p>
      {clusters === undefined || rooms === undefined || me === undefined ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : clusters === null || rooms === null || me === null ? (
        <p className="text-sm text-zinc-500">Couldn’t load clusters for this session.</p>
      ) : clusters.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing published yet.</p>
      ) : (
        <ul className="space-y-2">
          {clusters.map((c) => {
            const clusterRooms = rooms.filter((r) => r.clusterId === c._id);
            const helperConceptId = c.conceptIds.find((id) => me.helperConceptIds.includes(id));
            return (
              <li key={c._id} className="space-y-2 rounded-lg border border-zinc-200 p-3">
                <h3 className="font-medium">{c.title}</h3>
                {c.summary && <p className="text-sm text-zinc-600">{c.summary}</p>}
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                  {c.conceptLabels.map((label, i) => (
                    <span key={c.conceptIds[i]} className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                      {label}
                    </span>
                  ))}
                  <span>
                    {c.questionCount} question{c.questionCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    {c.helperCount} helper{c.helperCount === 1 ? "" : "s"} opted in
                  </span>
                </p>
                {clusterRooms.length > 0 && (
                  <ul className="space-y-1" aria-label={`Help rooms for ${c.title}`}>
                    {clusterRooms.map((r) => (
                      <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                        <span>
                          <span className="font-medium">{r.title}</span>
                          <span className="text-zinc-600"> · {roomSummary(r)}</span>
                        </span>
                        <RoomJoinButton
                          room={r}
                          token={token}
                          code={code}
                          asHelper={me.helperConceptIds.includes(r.conceptId)}
                          busy={busy}
                          onBusy={setBusy}
                          onError={setError}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {helperConceptId && (
                  <button
                    disabled={busy}
                    onClick={() => openRoom(c._id, helperConceptId)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Open a room as helper ({concepts.find((k) => k._id === helperConceptId)?.label ?? "this topic"})
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
