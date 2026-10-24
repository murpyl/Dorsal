"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";

export function HelperOptIn({
  sessionId,
  token,
  concepts,
}: {
  sessionId: Id<"sessions">;
  token: string;
  concepts: { _id: Id<"concepts">; label: string }[];
}) {
  const me = useQuery(api.participants.me, { sessionId, token });
  const setHelper = useMutation(api.participants.setHelper).withOptimisticUpdate((store, { conceptIds }) => {
    const current = store.getQuery(api.participants.me, { sessionId, token });
    if (current) store.setQuery(api.participants.me, { sessionId, token }, { ...current, helperConceptIds: conceptIds });
  });
  const [error, setError] = useState<string | null>(null);

  if (!me) return null;
  const helping = new Set(me.helperConceptIds);

  async function toggle(conceptId: Id<"concepts">, checked: boolean) {
    setError(null);
    const next = checked ? [...helping, conceptId] : [...helping].filter((id) => id !== conceptId);
    try {
      await setHelper({ sessionId, token, conceptIds: next });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4" aria-labelledby="helper-opt-in">
      <div>
        <h2 id="helper-opt-in" className="font-medium">
          Volunteer as a peer helper
        </h2>
        <p className="text-sm text-zinc-600">
          Tick the topics you feel comfortable explaining. This is your own call, not a test or an AI rating. Nobody
          is enrolled or contacted automatically: classmates only see you as <span className="font-medium">{me.alias}</span>{" "}
          in a help room you choose to open or join, and you can untick at any time.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {concepts.map((c) => (
          <li key={c._id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50">
              <input
                type="checkbox"
                checked={helping.has(c._id)}
                onChange={(e) => toggle(c._id, e.target.checked)}
                className="h-4 w-4"
              />
              I can help with <span className="font-medium">{c.label}</span>
            </label>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
