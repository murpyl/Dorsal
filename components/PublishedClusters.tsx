"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessagesSquare } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InlineError } from "@/components/InlineError";
import { RoomJoinButton, roomHref, roomSummary } from "@/components/RoomList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
    <Card className="enter" aria-labelledby="published-clusters">
      <CardHeader>
        <CardTitle id="published-clusters">What the class is asking</CardTitle>
        <CardDescription>Groups of pseudonymous questions your instructor has reviewed and published.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {clusters === undefined || rooms === undefined || me === undefined ? (
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : clusters === null || rooms === null || me === null ? (
          <p className="text-sm text-muted-foreground">Couldn’t load clusters for this session.</p>
        ) : clusters.length === 0 ? (
          <EmptyRow icon={<MessagesSquare aria-hidden />} text="Nothing published yet." />
        ) : (
          <ul className="space-y-2">
            {clusters.map((c, i) => {
              const clusterRooms = rooms.filter((r) => r.clusterId === c._id);
              const helperConceptId = c.conceptIds.find((id) => me.helperConceptIds.includes(id));
              return (
                <li key={c._id} className="enter space-y-2 rounded-lg border bg-background p-3" style={{ "--i": i } as React.CSSProperties}>
                  <div className="space-y-1">
                    <h3 className="font-medium">{c.title}</h3>
                    {c.summary && <p className="text-sm text-muted-foreground">{c.summary}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                    {c.conceptLabels.map((label, i) => (
                      <Badge key={c.conceptIds[i]} variant="secondary">
                        {label}
                      </Badge>
                    ))}
                    <span>
                      {c.questionCount} question{c.questionCount === 1 ? "" : "s"}
                    </span>
                    <span>
                      {c.helperCount} helper{c.helperCount === 1 ? "" : "s"} opted in
                    </span>
                  </div>
                  {clusterRooms.length > 0 && (
                    <ul className="space-y-1.5" aria-label={`Help rooms for ${c.title}`}>
                      {clusterRooms.map((r) => (
                        <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                          <span>
                            <span className="font-medium">{r.title}</span>
                            <span className="text-muted-foreground"> · {roomSummary(r)}</span>
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
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => openRoom(c._id, helperConceptId)}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Open a room as helper ({concepts.find((k) => k._id === helperConceptId)?.label ?? "this topic"})
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <InlineError message={error} />
      </CardContent>
    </Card>
  );
}

export function EmptyRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0">
      {icon}
      {text}
    </div>
  );
}
