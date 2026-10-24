"use client";

import Link from "next/link";
import { type KeyboardEvent, useId, useState } from "react";
import { ArrowRight, Bell, CheckCircle2, HandHelping, ListChecks, MessageCircleQuestion, Send, X } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ConfidenceSelector } from "@/components/ConfidenceSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Level } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { clusters, concepts as fixtureConcepts, conceptById, labelsFor, rooms, session } from "../fixtures";

type Tab = "topics" | "ask" | "help";
const TABS: { id: Tab; label: string; icon: typeof ListChecks }[] = [
  { id: "topics", label: "Topics", icon: ListChecks },
  { id: "ask", label: "Ask", icon: MessageCircleQuestion },
  { id: "help", label: "Help", icon: HandHelping },
];
const MAX_LENGTH = 500;
const ROOM_HREF = "/mock/projector/room";

export default function StudentProjectorMock() {
  const [tab, setTab] = useState<Tab>("topics");
  const [levels, setLevels] = useState<Record<string, Level | null>>(() =>
    Object.fromEntries(fixtureConcepts.map((c) => [c._id, c.myLevel])),
  );
  const [helping, setHelping] = useState<string[]>(session.me.helperConceptIds);
  const [notice, setNotice] = useState<{ title: string; tab: Tab } | null>({
    title: "Your instructor published “Stack frames vs environment diagrams”",
    tab: "ask",
  });
  const [seenAsk, setSeenAsk] = useState(false);
  const tabsId = useId();

  const active = conceptById[session.activeConceptId];
  const others = fixtureConcepts.filter((c) => c._id !== active._id);
  const answered = Object.values(levels).filter(Boolean).length;
  const openRooms = rooms.length;

  const go = (next: Tab) => {
    setTab(next);
    if (next === "ask") setSeenAsk(true);
    window.scrollTo({ top: 0 });
  };
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    if (e.key === "ArrowRight") go(TABS[(i + 1) % TABS.length].id);
    if (e.key === "ArrowLeft") go(TABS[(i - 1 + TABS.length) % TABS.length].id);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <Brand />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden min-[360px]:inline">{session.me.alias}</span>
            <Badge variant="outline" className="font-mono tracking-widest">
              {session.code}
            </Badge>
          </div>
        </div>
        <button
          type="button"
          onClick={() => go("topics")}
          className="pressable flex w-full items-center gap-3 border-t bg-card px-3 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
          aria-label={`Current topic: ${active.label}. Go to Topics.`}
        >
          <span className="relative flex size-2.5 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Now in lecture</span>
            <span className="block truncate font-heading text-base font-semibold">{active.label}</span>
          </span>
          {levels[active._id] ? (
            <Badge variant="secondary" className="shrink-0">
              answered
            </Badge>
          ) : (
            <Badge className="shrink-0">tap to answer</Badge>
          )}
        </button>
      </header>

      <main className="flex-1 space-y-4 p-3 pb-28" aria-live="polite">
        {notice && (
          <div className="enter flex items-start gap-2.5 rounded-lg border border-primary/30 bg-accent px-3 py-2.5 text-sm">
            <Bell className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p className="min-w-0 flex-1">
              {notice.title}.{" "}
              <button type="button" className="font-semibold underline underline-offset-3" onClick={() => go(notice.tab)}>
                See it
              </button>
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setNotice(null)}
              className="-m-1 rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}

        {tab === "topics" && (
          <section role="tabpanel" id={`${tabsId}-topics`} aria-labelledby={`${tabsId}-tab-topics`} className="space-y-4">
            <Card className="enter ring-2 ring-foreground/80">
              <CardHeader>
                <Badge className="mb-1 w-fit">Current topic</Badge>
                <CardTitle render={<h1 />} className="text-2xl">
                  {active.label}
                </CardTitle>
                <CardDescription>{active.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-medium">How well do you follow this right now?</p>
                <ConfidenceSelector value={levels[active._id]} onChange={(level) => setLevels((s) => ({ ...s, [active._id]: level }))} />
                <p className="text-xs text-muted-foreground">Only you see your answer. Change it whenever your understanding changes.</p>
              </CardContent>
            </Card>

            <div className="flex items-baseline justify-between px-1">
              <h2 className="font-heading text-base font-semibold">Earlier &amp; upcoming</h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {answered} of {fixtureConcepts.length} answered
              </span>
            </div>
            <ul className="space-y-2">
              {others.map((c, i) => (
                <li key={c._id}>
                  <Card size="sm" className="enter" style={{ "--i": i + 1 } as React.CSSProperties}>
                    <CardHeader>
                      <CardTitle render={<h3 />} className="text-[15px]">
                        {c.label}
                      </CardTitle>
                      <CardDescription className="text-xs">{c.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ConfidenceSelector value={levels[c._id]} onChange={(level) => setLevels((s) => ({ ...s, [c._id]: level }))} />
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === "ask" && <AskPanel id={`${tabsId}-ask`} labelledBy={`${tabsId}-tab-ask`} helping={helping} />}
        {tab === "help" && (
          <HelpPanel id={`${tabsId}-help`} labelledBy={`${tabsId}-tab-help`} helping={helping} setHelping={setHelping} />
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)]"
        aria-label="Sections"
      >
        <div role="tablist" aria-orientation="horizontal" onKeyDown={onTabKey} className="mx-auto grid max-w-xl grid-cols-3">
          {TABS.map(({ id, label, icon: Icon }) => {
            const selected = tab === id;
            const badge = id === "ask" && !seenAsk ? "new" : id === "help" ? String(openRooms) : null;
            return (
              <button
                key={id}
                id={`${tabsId}-tab-${id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`${tabsId}-${id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => go(id)}
                className={cn(
                  "pressable relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                  selected ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", selected && "bg-accent")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
                {badge && (
                  <span
                    className={cn(
                      "absolute top-2 left-1/2 ml-2.5 rounded-full px-1.5 text-[10px] leading-4 font-bold tabular-nums",
                      badge === "new" ? "bg-destructive text-background" : "bg-secondary text-secondary-foreground",
                    )}
                    aria-label={badge === "new" ? "new published cluster" : `${badge} open rooms`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function AskPanel({ id, labelledBy, helping }: { id: string; labelledBy: string; helping: string[] }) {
  const [conceptId, setConceptId] = useState(session.activeConceptId);
  const [content, setContent] = useState("");
  const [sent, setSent] = useState(false);
  const items = fixtureConcepts.map((c) => ({
    value: c._id,
    label: c._id === session.activeConceptId ? `${c.label} (current topic)` : c.label,
  }));
  const published = clusters.filter((c) => c.status === "published");

  return (
    <section role="tabpanel" id={id} aria-labelledby={labelledBy} className="space-y-4">
      <form
        className="enter"
        onSubmit={(e) => {
          e.preventDefault();
          if (!content.trim()) return;
          setSent(true);
          setContent("");
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle render={<h1 />} className="text-xl">
              Ask a question
            </CardTitle>
            <CardDescription>Goes to your instructor only, under your alias. The class never sees who asked.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              about
              <Select items={items} value={conceptId} onValueChange={(v) => v && setConceptId(v)}>
                <SelectTrigger size="sm" aria-label="Question topic" className="min-w-0 flex-1">
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
            <Textarea
              value={content}
              onChange={(e) => {
                setSent(false);
                setContent(e.target.value.slice(0, MAX_LENGTH));
              }}
              rows={4}
              placeholder="What's confusing you? Describe it in your own words."
              aria-label="Your question"
              className="resize-none text-base"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
                {content.length}/{MAX_LENGTH}
              </span>
              <Button type="submit" size="lg" disabled={!content.trim()}>
                Send anonymously
                <Send data-icon="inline-end" aria-hidden />
              </Button>
            </div>
            {sent && (
              <p className="enter flex items-start gap-1.5 text-sm text-teal-800">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                Sent to your instructor. It stays private until they publish a cluster that includes it.
              </p>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Asking is optional. Classmates never see who asked; your instructor sees the question under your alias, not your
              name, and operators of this service could still link it to your device (pseudonymous, not fully anonymous). Question
              text is sent to an external AI (Claude, by Anthropic) to group similar questions — don&apos;t include names or personal
              details.
            </p>
          </CardContent>
        </Card>
      </form>

      <Card className="enter" style={{ "--i": 1 } as React.CSSProperties} aria-labelledby="published-clusters">
        <CardHeader>
          <CardTitle id="published-clusters" render={<h2 />}>
            What the class is asking
          </CardTitle>
          <CardDescription>Groups of pseudonymous questions your instructor has reviewed and published.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {published.map((c, i) => {
              const clusterRooms = rooms.filter((r) => r.clusterId === c._id);
              const canHelp = c.conceptIds.some((cid) => helping.includes(cid));
              return (
                <li key={c._id} className="enter space-y-2 rounded-lg border bg-background p-3" style={{ "--i": i + 2 } as React.CSSProperties}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium">{c.title}</h3>
                    {c.publishedAt && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{c.publishedAt}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.summary}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                    {labelsFor(c.conceptIds).map((l) => (
                      <Badge key={l} variant="secondary">
                        {l}
                      </Badge>
                    ))}
                    <span>{c.questionIds.length} questions</span>
                    <span>
                      {c.helperCount} helper{c.helperCount === 1 ? "" : "s"} opted in
                    </span>
                  </div>
                  {clusterRooms.map((r) => (
                    <div key={r._id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium">Help room</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {r.members.length} / {r.capacity} · {r.members.filter((m) => m.role === "helper").length} helper{r.members.filter((m) => m.role === "helper").length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <RoomButton room={r} asHelper={helping.includes(r.conceptId)} />
                    </div>
                  ))}
                  {canHelp && clusterRooms.length === 0 && (
                    <Button size="sm" className="bg-teal-700 text-white hover:bg-teal-800" nativeButton={false} render={<Link href={ROOM_HREF} />}>
                      Open a room as helper
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function HelpPanel({
  id,
  labelledBy,
  helping,
  setHelping,
}: {
  id: string;
  labelledBy: string;
  helping: string[];
  setHelping: (ids: string[]) => void;
}) {
  const helperConcepts = fixtureConcepts.filter((c) => helping.includes(c._id));
  const [openFor, setOpenFor] = useState(helperConcepts[0]?._id ?? "");
  const chosen = helperConcepts.find((c) => c._id === openFor) ?? helperConcepts[0] ?? null;
  const items = helperConcepts.map((c) => ({ value: c._id, label: c.label }));

  return (
    <section role="tabpanel" id={id} aria-labelledby={labelledBy} className="space-y-4">
      <Card className="enter" aria-labelledby="help-rooms">
        <CardHeader>
          <CardTitle id="help-rooms" render={<h1 />} className="text-xl">
            Peer help rooms
          </CardTitle>
          <CardDescription>Small live chats (max 6 people) on one topic. Join only if you want to; leave any time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2">
            {rooms.map((r, i) => {
              const helpers = r.members.filter((m) => m.role === "helper").length;
              return (
                <li
                  key={r._id}
                  className={cn("enter space-y-2 rounded-lg border bg-background p-3 text-sm", r.isMember && "border-primary/40 bg-accent/60")}
                  style={{ "--i": i + 1 } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium">{r.title}</p>
                      <p className="text-muted-foreground">
                        {conceptById[r.conceptId].label} · {r.members.length} / {r.capacity} in room · {helpers} helper{helpers === 1 ? "" : "s"}
                      </p>
                    </div>
                    {r.isMember && <Badge>you&apos;re in</Badge>}
                  </div>
                  <RoomButton room={r} asHelper={helping.includes(r.conceptId)} wide />
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="enter" style={{ "--i": 3 } as React.CSSProperties} aria-labelledby="helper-opt-in">
        <CardHeader>
          <CardTitle id="helper-opt-in" render={<h2 />}>
            Volunteer as a peer helper
          </CardTitle>
          <CardDescription>
            Tick the topics you feel comfortable explaining. This is your own call, not a test or an AI rating. Nobody is
            enrolled or contacted automatically: classmates only see you as{" "}
            <span className="font-medium text-foreground">{session.me.alias}</span> in a help room you choose to open or join,
            and you can untick at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="grid gap-2">
            {fixtureConcepts.map((c) => {
              const checked = helping.includes(c._id);
              return (
                <li key={c._id}>
                  <label
                    className={cn(
                      "pressable flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                      checked ? "border-teal-300 bg-teal-50 text-teal-950" : "border-border bg-background hover:bg-muted",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => setHelping(v === true ? [...helping, c._id] : helping.filter((x) => x !== c._id))}
                      className={cn("size-5", checked && "border-teal-700 bg-teal-700 text-white data-checked:border-teal-700 data-checked:bg-teal-700")}
                    />
                    <span>
                      I can help with <span className="font-medium">{c.label}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {chosen && (
            <form
              className="enter flex flex-wrap items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm"
              onSubmit={(e) => e.preventDefault()}
            >
              <label htmlFor="helper-room-concept" className="w-full font-medium text-teal-950">
                Open a help room as a helper for
              </label>
              <Select items={items} value={chosen._id} onValueChange={(v) => v && setOpenFor(v)}>
                <SelectTrigger id="helper-room-concept" size="sm" aria-label="Topic" className="min-w-0 flex-1 bg-background">
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
              <Button size="sm" className="bg-teal-700 text-white hover:bg-teal-800" nativeButton={false} render={<Link href={ROOM_HREF} />}>
                Open room
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function RoomButton({ room, asHelper, wide }: { room: (typeof rooms)[number]; asHelper: boolean; wide?: boolean }) {
  const cls = wide ? "w-full" : undefined;
  if (room.isMember)
    return (
      <Button size={wide ? "lg" : "sm"} className={cls} nativeButton={false} render={<Link href={ROOM_HREF} />}>
        Open room ({room.myRole})
        <ArrowRight data-icon="inline-end" aria-hidden />
      </Button>
    );
  if (room.members.length >= room.capacity) return <Badge variant="secondary">Full</Badge>;
  return (
    <Button size={wide ? "lg" : "sm"} variant="outline" className={cls} nativeButton={false} render={<Link href={ROOM_HREF} />}>
      {asHelper ? "Join as helper" : "Join"}
    </Button>
  );
}
