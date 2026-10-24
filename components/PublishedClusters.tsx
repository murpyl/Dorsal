"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function PublishedClusters({ sessionId, token }: { sessionId: Id<"sessions">; token: string }) {
  const clusters = useQuery(api.clusters.listPublished, { sessionId, token });

  return (
    <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4" aria-label="Published question clusters">
      <h2 className="font-medium">What the class is asking</h2>
      <p className="text-xs text-zinc-500">Groups of anonymous questions your instructor has reviewed and published.</p>
      {clusters === undefined ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : clusters.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing published yet.</p>
      ) : (
        <ul className="space-y-2">
          {clusters.map((c) => (
            <li key={c._id} className="rounded-lg border border-zinc-200 p-3">
              <h3 className="font-medium">{c.title}</h3>
              {c.summary && <p className="text-sm text-zinc-600">{c.summary}</p>}
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
