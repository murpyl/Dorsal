"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, MessagesSquare, Send } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ConfidenceSelector } from "@/components/ConfidenceSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEVELS, type Level } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { CLUSTERS, CONCEPTS, MY_HELPER_CONCEPT_IDS, MY_LEVELS, ROOMS, SESSION, conceptLabel, type Cluster, type Room } from "../fixtures";

const MAX_LENGTH = 500;
const levelMeta = (level: Level | null) => LEVELS.find((l) => l.value === level) ?? null;

export default function ControlRoomStudent() {
  const [activeId, setActiveId] = useState(SESSION.activeConceptId);
  const [levels, setLevels] = useState<Record<string, Level | null>>(MY_LEVELS);
  const [helping, setHelping] = useState<string[]>(MY_HELPER_CONCEPT_IDS);
  const [published, setPublished] = useState<Cluster[]>(CLUSTERS.filter((k) => k.status === "published"));
  const [rooms, setRooms] = useState<Room[]>(ROOMS);
  const [newClusterId, setNewClusterId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; href: string } | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = CONCEPTS.find((c) => c._id === activeId)!;
  const myActive = levels[activeId] ?? null;
  const others = CONCEPTS.filter((c) => c._id !== activeId);

  const announce = useCallback((text: string, href: string) => {
    setToast({ text, href });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  function answer(conceptId: string, level: Level) {
    setLevels((l) => ({ ...l, [conceptId]: level }));
    setSavedAt(conceptId);
    setTimeout(() => setSavedAt(null), 2000);
  }

  // Mockup-only: stand in for the instructor's "Make current topic" / "Publish" events.
  function simulateTopicChange() {
    const next = CONCEPTS[(CONCEPTS.findIndex((c) => c._id === activeId) + 1) % CONCEPTS.length];
    setActiveId(next._id);
    announce(`Topic changed → ${next.label}`, "#now");
  }
  function simulatePublish() {
    const k = CLUSTERS.find((c) => !published.some((p) => p._id === c._id));
    if (!k) return;
    setPublished((ps) => [{ ...k, status: "published" }, ...ps]);
    setNewClusterId(k._id);
    announce(`New from your instructor: “${k.title}”`, "#asking");
  }
  function joinRoom(id: string) {
    setRooms((rs) => rs.map((r) => (r._id === id && !r.members.some((m) => m.isMe) ? { ...r, members: [...r.members, { alias: SESSION.alias, role: "learner", isMe: true }] } : r)));
  }

  useEffect(() => {
    if (!newClusterId) return;
    const t = setTimeout(() => setNewClusterId(null), 12000);
    return () => clearTimeout(t);
  }, [newClusterId]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="flex items-center justify-between gap-2 px-3 pt-2.5 sm:px-4">
          <Brand />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{SESSION.alias}</span>
            <Badge variant="outline" className="font-mono tracking-widest">
              {SESSION.code}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 pt-2 pb-2.5 sm:px-4" aria-live="polite">
          <span className="relative flex size-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="text-muted-foreground">Now: </span>
            <a href="#now" className="font-semibold underline-offset-3 hover:underline">
              {active.label}
            </a>
          </p>
          <AnswerChip level={myActive} />
        </div>
        {toast && (
          <a
            key={toast.text}
            href={toast.href}
            onClick={() => setToast(null)}
            className="enter mx-3 mb-2.5 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm sm:mx-4"
          >
            <span className="truncate">{toast.text}</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </a>
        )}
      </header>

      <main className="space-y-4 p-3 pb-44 sm:p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{SESSION.title}</span> · you appear as {SESSION.alias}, pseudonymous to classmates.
        </p>

        <Card id="now" className="enter scroll-mt-28 ring-2 ring-foreground/80">
          <CardHeader>
            <Badge className="mb-1 w-fit">Current topic</Badge>
            <CardTitle render={<h1 />} className="text-xl">
              {active.label}
            </CardTitle>
            <CardDescription>{active.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Rate it with the bar at the bottom of your screen.</span>
            <Button size="sm" variant="outline" nativeButton={false} render={<a href="#ask" />}>
              Ask about this
            </Button>
          </CardContent>
        </Card>

        <Composer concepts={CONCEPTS} activeConceptId={activeId} />

        <Card id="asking" className="enter scroll-mt-28" aria-labelledby="asking-heading" style={{ "--i": 1 } as React.CSSProperties}>
          <CardHeader>
            <CardTitle id="asking-heading" render={<h2 />}>
              What the class is asking
            </CardTitle>
            <CardDescription>Groups of pseudonymous questions your instructor has reviewed and published. Join a room if one would help.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {published.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                <MessagesSquare className="size-4" aria-hidden /> Nothing published yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {published.map((k) => {
                  const kRooms = rooms.filter((r) => r.clusterId === k._id);
                  const helperConceptId = k.conceptIds.find((id) => helping.includes(id));
                  const isNew = k._id === newClusterId;
                  return (
                    <li key={k._id} className={cn("enter space-y-2 rounded-lg border bg-background p-3", isNew && "border-primary/50 bg-primary/5")}>
                      <div className="space-y-1">
                        <h3 className="flex items-center gap-2 font-medium">
                          {isNew && <Badge>New</Badge>}
                          {k.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{k.summary}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                        {k.conceptIds.map((id) => (
                          <Badge key={id} variant="secondary">
                            {conceptLabel(id)}
                          </Badge>
                        ))}
                        <span>{k.questionIds.length} questions</span>
                        <span>
                          {k.helperCount} helper{k.helperCount === 1 ? "" : "s"} opted in
                        </span>
                      </div>
                      {kRooms.map((r) => (
                        <RoomRow key={r._id} room={r} onJoin={() => joinRoom(r._id)} asHelper={helping.includes(r.conceptId)} />
                      ))}
                      {helperConceptId && (
                        <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                          Open a room as helper ({conceptLabel(helperConceptId)})
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="enter" aria-labelledby="others-heading" style={{ "--i": 2 } as React.CSSProperties}>
          <CardHeader>
            <CardTitle id="others-heading" render={<h2 />}>
              Other concepts in this lecture
            </CardTitle>
            <CardDescription>Only you can see your answers. Update them whenever something clicks (or stops clicking).</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {others.map((c) => (
                <li key={c._id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium">{c.label}</h3>
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    </div>
                    <AnswerChip level={levels[c._id] ?? null} compact />
                  </div>
                  <ConfidenceSelector value={levels[c._id] ?? null} onChange={(l) => answer(c._id, l)} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="enter" aria-labelledby="helper-heading" style={{ "--i": 3 } as React.CSSProperties}>
          <CardHeader>
            <CardTitle id="helper-heading" render={<h2 />}>
              Volunteer as a peer helper
            </CardTitle>
            <CardDescription>
              Tick the topics you feel comfortable explaining. This is your own call, not a test or an AI rating. Nobody is enrolled or contacted
              automatically: classmates only see you as <span className="font-medium text-foreground">{SESSION.alias}</span> in a help room you choose
              to open or join, and you can untick at any time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {CONCEPTS.map((c) => {
                const checked = helping.includes(c._id);
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
                        onCheckedChange={(v) => setHelping((h) => (v ? [...h, c._id] : h.filter((id) => id !== c._id)))}
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
          </CardContent>
        </Card>

        <Card className="enter" aria-labelledby="rooms-heading" style={{ "--i": 4 } as React.CSSProperties}>
          <CardHeader>
            <CardTitle id="rooms-heading" render={<h2 />}>
              Peer help rooms
            </CardTitle>
            <CardDescription>Small live chat rooms (max 6 people) on one topic. Join only if you want to; you can leave any time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rooms.map((r) => (
              <RoomRow key={r._id} room={r} onJoin={() => joinRoom(r._id)} asHelper={helping.includes(r.conceptId)} showConcept />
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium">Mockup controls</span>
          <Button size="xs" variant="outline" onClick={simulateTopicChange}>
            Instructor changes topic
          </Button>
          <Button size="xs" variant="outline" onClick={simulatePublish} disabled={published.length === CLUSTERS.length}>
            Instructor publishes a cluster
          </Button>
          <Link href="/mock/control-room" className="ml-auto underline underline-offset-3">
            All layouts
          </Link>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/85" role="region" aria-label="Current topic answer">
        <div key={activeId} className="enter mx-auto w-full max-w-xl space-y-2 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <p className="min-w-0 truncate">
              <span className="text-muted-foreground">Right now, </span>
              <span className="font-semibold">{active.label}</span>
              <span className="text-muted-foreground"> is…</span>
            </p>
            <span className="shrink-0 text-xs text-emerald-700" role="status">
              {savedAt === activeId ? (
                <span className="enter flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" aria-hidden /> Saved
                </span>
              ) : (
                myActive && <span className="text-muted-foreground">Tap again to change</span>
              )}
            </span>
          </div>
          <ConfidenceSelector value={myActive} onChange={(l) => answer(activeId, l)} />
        </div>
      </div>
    </div>
  );
}

function AnswerChip({ level, compact }: { level: Level | null; compact?: boolean }) {
  const meta = levelMeta(level);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
        meta ? "bg-background" : "border-dashed text-muted-foreground",
      )}
      aria-label={meta ? `Your answer: ${meta.label}` : "Not answered yet"}
    >
      {meta && <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />}
      {meta ? (compact ? meta.label : `You: ${meta.label}`) : compact ? "—" : "Not answered"}
    </span>
  );
}

function RoomRow({ room, onJoin, asHelper, showConcept }: { room: Room; onJoin: () => void; asHelper: boolean; showConcept?: boolean }) {
  const isMember = room.members.some((m) => m.isMe);
  const full = room.members.length >= room.capacity;
  const helpers = room.members.filter((m) => m.role === "helper").length;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm">
      <span className="min-w-0">
        <span className="block truncate font-medium">{room.title}</span>
        <span className="text-xs text-muted-foreground">
          {showConcept && <>{conceptLabel(room.conceptId)} · </>}
          {room.members.length} / {room.capacity} in room · {helpers} helper{helpers === 1 ? "" : "s"}
        </span>
      </span>
      {isMember ? (
        <Button size="sm" nativeButton={false} render={<Link href="/mock/control-room/room" />}>
          Open ({asHelper ? "helper" : "learner"})
          <ArrowRight data-icon="inline-end" aria-hidden />
        </Button>
      ) : full ? (
        <Badge variant="secondary">Full</Badge>
      ) : (
        <Button size="sm" variant="outline" onClick={onJoin}>
          {asHelper ? "Join as helper" : "Join"}
        </Button>
      )}
    </div>
  );
}

function Composer({ concepts, activeConceptId }: { concepts: { _id: string; label: string }[]; activeConceptId: string }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [sent, setSent] = useState(false);
  const conceptId = picked ?? activeConceptId;
  const items = concepts.map((c) => ({ value: c._id, label: c._id === activeConceptId ? `${c.label} (current topic)` : c.label }));
  const trimmed = content.trim();
  return (
    <form
      id="ask"
      className="enter scroll-mt-28"
      style={{ "--i": 1 } as React.CSSProperties}
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed) return;
        setContent("");
        setSent(true);
      }}
    >
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle render={<h2 />}>Ask a question</CardTitle>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            about
            <Select items={items} value={conceptId} onValueChange={(v) => v && setPicked(v)}>
              <SelectTrigger size="sm" aria-label="Question topic" className="max-w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {items.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value.slice(0, MAX_LENGTH));
              setSent(false);
            }}
            maxLength={MAX_LENGTH}
            rows={3}
            placeholder="What's confusing you? Describe it in your own words."
            aria-label="Your question"
            className="resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
              {content.length}/{MAX_LENGTH}
            </span>
            <Button type="submit" disabled={!trimmed}>
              Send anonymously
              <Send data-icon="inline-end" aria-hidden />
            </Button>
          </div>
          {sent && (
            <p className="enter flex items-start gap-1.5 text-sm text-emerald-700" role="status">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
              Sent to your instructor. It stays private until they publish a cluster that includes it.
            </p>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Asking is optional. Classmates never see who asked; your instructor sees the question under your alias, not your name, and operators
            of this service could still link it to your device (pseudonymous, not fully anonymous). Question text is sent to an external AI
            (Claude, by Anthropic) to group similar questions — don&apos;t include names or personal details.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
