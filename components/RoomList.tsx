"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, DoorOpen } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InlineError } from "@/components/InlineError";
import { EmptyRow } from "@/components/PublishedClusters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/errors";

type Concept = { _id: Id<"concepts">; label: string };

export const roomHref = (roomId: Id<"rooms">, code: string) => `/room/${roomId}?code=${encodeURIComponent(code)}`;
/** A TA's room link: `?ta=<sessionId>` tells PeerRoom to use this device's TA secret and link back to the dashboard. */
export const taRoomHref = (roomId: Id<"rooms">, sessionId: Id<"sessions">) => `/room/${roomId}?ta=${encodeURIComponent(sessionId)}`;

export type StudentRoom = {
  _id: Id<"rooms">;
  title: string;
  conceptId: Id<"concepts">;
  conceptLabel: string;
  clusterId: Id<"clusters"> | null;
  clusterTitle: string | null;
  capacity: number;
  memberCount: number;
  helperCount: number;
  taCount: number;
  isMember: boolean;
  myRole: "helper" | "learner" | "ta" | null;
};

export const roomSummary = (r: StudentRoom) =>
  `${r.memberCount} / ${r.capacity} students · ${r.helperCount} helper${r.helperCount === 1 ? "" : "s"}${r.taCount > 0 ? ` · ${r.taCount} TA${r.taCount === 1 ? "" : "s"}` : ""}`;

/** Join / Open / Full control shared by RoomList and PublishedClusters. Joins, then navigates to the room with the ?code= convention. */
export function RoomJoinButton({
  room,
  token,
  code,
  asHelper,
  busy,
  onBusy,
  onError,
}: {
  room: StudentRoom;
  token: string;
  code: string;
  asHelper: boolean;
  busy: boolean;
  onBusy: (b: boolean) => void;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const join = useMutation(api.rooms.join);
  if (room.isMember) {
    return (
      <Button size="sm" nativeButton={false} render={<Link href={roomHref(room._id, code)} />}>
        Open ({room.myRole})
        <ArrowRight data-icon="inline-end" aria-hidden />
      </Button>
    );
  }
  if (room.memberCount >= room.capacity) {
    return <Badge variant="secondary">Full</Badge>;
  }
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        onBusy(true);
        onError(null);
        try {
          await join({ roomId: room._id, token, role: asHelper ? "helper" : "learner" });
          router.push(roomHref(room._id, code));
        } catch (err) {
          onError(errorMessage(err));
        } finally {
          onBusy(false);
        }
      }}
    >
      {asHelper ? "Join as helper" : "Join"}
    </Button>
  );
}

function ConceptSelect({
  id,
  concepts,
  value,
  onChange,
  label,
}: {
  id: string;
  concepts: Concept[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const items = concepts.map((c) => ({ value: c._id, label: c.label }));
  return (
    <Select items={items} value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger id={id} size="sm" aria-label={label} className="min-w-40 bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((it) => (
          <SelectItem key={it.value} value={it.value}>
            {it.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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
  const [conceptId, setConceptId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (rooms === undefined || me === undefined) return <Skeleton className="h-32" />;
  if (rooms === null || me === null) return <p className="text-sm text-muted-foreground">Couldn’t load help rooms for this session.</p>;
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
    <Card className="enter" aria-labelledby="help-rooms">
      <CardHeader>
        <CardTitle id="help-rooms" render={<h2 />}>Peer help rooms</CardTitle>
        <CardDescription>
          Small live chat rooms (max {rooms[0]?.capacity ?? 6} students) on one topic. Join only if you want to; you can leave any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {chosen && (
          <form
            className="enter flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => createAsHelper({ sessionId, token, conceptId: chosen._id }));
            }}
          >
            <label htmlFor="helper-room-concept" className="font-medium text-emerald-950">
              Open a help room as a helper for
            </label>
            <ConceptSelect id="helper-room-concept" concepts={helperConcepts} value={chosen._id} onChange={setConceptId} label="Topic" />
            <Button type="submit" size="sm" disabled={busy} className="bg-emerald-600 text-white hover:bg-emerald-700">
              Open room
            </Button>
          </form>
        )}

        {rooms.length === 0 ? (
          <EmptyRow icon={<DoorOpen aria-hidden />} text="No open help rooms yet." />
        ) : (
          <ul className="space-y-3">
            {rooms.map((r, i) => (
              <li
                key={r._id}
                className="enter flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-4 text-sm"
                style={{ "--i": i } as React.CSSProperties}
              >
                <div className="space-y-1">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-muted-foreground">
                    {r.conceptLabel} · {roomSummary(r)}
                  </p>
                  {r.clusterTitle && <p className="text-xs text-muted-foreground">For cluster “{r.clusterTitle}”</p>}
                </div>
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
        <InlineError message={error} />
      </CardContent>
    </Card>
  );
}

export function RoomStatus({
  sessionId,
  instructorSecret,
  concepts,
  role,
  conceptFilter,
}: {
  sessionId: Id<"sessions">;
  instructorSecret: string;
  concepts: Concept[];
  role: "instructor" | "ta";
  /** Only rooms on this concept; null for all concepts. */
  conceptFilter: Id<"concepts"> | null;
}) {
  const rooms = useQuery(api.rooms.listInstructor, { sessionId, instructorSecret })?.filter(
    (r) => !conceptFilter || r.conceptId === conceptFilter,
  );
  const createForCluster = useMutation(api.rooms.createForCluster);
  const close = useMutation(api.rooms.close);
  const joinAsTa = useMutation(api.rooms.joinAsTa);
  const router = useRouter();
  const [conceptId, setConceptId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const chosen = concepts.find((c) => c._id === (conceptFilter ?? conceptId)) ?? concepts[0] ?? null;

  async function guard(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card aria-labelledby="room-status">
      <CardHeader>
        <CardTitle id="room-status" render={<h2 />}>Help rooms (live)</CardTitle>
        <CardDescription>Open a room from a published cluster, or pick a topic here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {chosen && (
          <form
            className="flex flex-wrap items-center gap-2 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              guard(() => createForCluster({ sessionId, instructorSecret, conceptId: chosen._id }));
            }}
          >
            <label htmlFor="instructor-room-concept">Open help room for</label>
            {conceptFilter ? (
              <strong>{chosen.label}</strong>
            ) : (
              <ConceptSelect id="instructor-room-concept" concepts={concepts} value={chosen._id} onChange={setConceptId} label="Topic" />
            )}
            <Button type="submit" size="sm">
              Open help room
            </Button>
          </form>
        )}
        {rooms === undefined ? (
          <Skeleton className="h-16" />
        ) : rooms === null ? (
          <p className="text-sm text-muted-foreground">Couldn’t load rooms (no instructor access).</p>
        ) : rooms.length === 0 ? (
          <EmptyRow icon={<DoorOpen aria-hidden />} text="No open rooms." />
        ) : (
          <ul className="space-y-3 text-sm">
            {rooms.map((r) => (
              <li key={r._id} className="enter flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-4">
                <div className="space-y-1">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-muted-foreground">
                    {r.conceptLabel} · <strong className="text-foreground">{r.memberCount}</strong> / {r.capacity} students · {r.helperCount} helper
                    {r.helperCount === 1 ? "" : "s"}
                    {r.taCount > 0 && ` · ${r.taCount} TA${r.taCount === 1 ? "" : "s"}`}
                    {r.memberCount >= r.capacity && (
                      <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-900">
                        full
                      </Badge>
                    )}
                  </p>
                  {r.clusterTitle && <p className="text-xs text-muted-foreground">For cluster “{r.clusterTitle}”</p>}
                </div>
                <div className="flex gap-2">
                  {role === "ta" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        guard(async () => {
                          await joinAsTa({ roomId: r._id, instructorSecret });
                          router.push(taRoomHref(r._id, sessionId));
                        })
                      }
                    >
                      Enter room
                      <ArrowRight data-icon="inline-end" aria-hidden />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => guard(() => close({ roomId: r._id, instructorSecret }))}>
                    Close room
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <InlineError message={error} />
      </CardContent>
    </Card>
  );
}
