"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InlineError } from "@/components/InlineError";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

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

  if (me === undefined) return <Skeleton className="h-40" />;
  if (me === null) return <p className="text-sm text-muted-foreground">Couldn’t load helper settings for this session.</p>;
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
    <Card className="enter" aria-labelledby="helper-opt-in">
      <CardHeader>
        <CardTitle id="helper-opt-in" render={<h2 />}>Volunteer as a peer helper</CardTitle>
        <CardDescription>
          Tick the topics you feel comfortable explaining. This is your own call, not a test or an AI rating. Nobody is enrolled
          or contacted automatically: classmates only see you as <span className="font-medium text-foreground">{me.alias}</span>{" "}
          in a help room you choose to open or join, and you can untick at any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="grid gap-2 sm:grid-cols-2">
          {concepts.map((c) => {
            const checked = helping.has(c._id);
            return (
              <li key={c._id}>
                <label
                  className={cn(
                    "pressable flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                    checked ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-border bg-background hover:bg-muted",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggle(c._id, value === true)}
                    className={cn(checked && "border-emerald-600 bg-emerald-600 text-white data-checked:border-emerald-600 data-checked:bg-emerald-600")}
                  />
                  <span>
                    I can help with <span className="font-medium">{c.label}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <InlineError message={error} />
      </CardContent>
    </Card>
  );
}
