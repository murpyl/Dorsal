"use client";

import { useState } from "react";
import { ArrowUp, CheckCircle2, DoorOpen, Frown, HandHelping, Layers, Meh, MessageSquarePlus, Send, Smile, Users } from "lucide-react";
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
import { clusters as fixtureClusters, concepts as fixtureConcepts, me, questions, rooms, session } from "../fixtures";
import { Avatar, MockBanner, Toast, relTime, useToast } from "../ui";

type Tab = "topics" | "ask" | "help";
const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: "topics", label: "Topics", icon: Layers },
  { id: "ask", label: "Ask", icon: MessageSquarePlus },
  { id: "help", label: "Help", icon: HandHelping },
];
const ICONS: Record<Level, typeof Frown> = { confused: Frown, partial: Meh, can_explain: Smile };
const SHORT: Record<Level, string> = { confused: "Confused", partial: "Partly", can_explain: "Can explain" };

export default function StudentMock() {
  const [tab, setTab] = useState<Tab>("topics");
  const [activeId, setActiveId] = useState(session.activeConceptId);
  const [levels, setLevels] = useState<Record<string, Level | null>>(Object.fromEntries(fixtureConcepts.map((c) => [c._id, c.myLevel])));
  const [helping, setHelping] = useState<string[]>(me.helperConceptIds);
  const [published, setPublished] = useState(fixtureClusters.filter((c) => c.status === "published"));
  const [unseenHelp, setUnseenHelp] = useState(1);
  const [draft, setDraft] = useState("");
  const [askAbout, setAskAbout] = useState<string>(activeId);
  const [sent, setSent] = useState(questions.filter((q) => q.alias === me.alias).map((q) => ({ ...q, time: relTime(q.minutesAgo) })));
  const [justSent, setJustSent] = useState(false);
  const { toast, show, dismiss } = useToast();

  const active = fixtureConcepts.find((c) => c._id === activeId)!;
  const others = fixtureConcepts.filter((c) => c._id !== activeId);
  const myLevel = levels[activeId];
  const openTab = (t: Tab) => {
    setTab(t);
    if (t === "help") setUnseenHelp(0);
    window.scrollTo({ top: 0 });
  };

  // Mock-only event triggers so the announcement patterns can be seen without a backend.
  const simulate = {
    topic: () => {
      const next = fixtureConcepts[(fixtureConcepts.findIndex((c) => c._id === activeId) + 1) % fixtureConcepts.length];
      setActiveId(next._id);
      setAskAbout(next._id);
      show({ text: `Topic changed to “${next.label}”`, action: { label: "Go", onClick: () => openTab("topics") } });
    },
    cluster: () => {
      const next = fixtureClusters.find((c) => c.status === "suggested" && !published.some((p) => p._id === c._id));
      if (!next) return;
      setPublished((p) => [{ ...next, status: "published", publishedMinutesAgo: 0 }, ...p]);
      if (tab !== "help") setUnseenHelp((n) => n + 1);
      show({ text: `New question group: “${next.title}”`, action: { label: "See it", onClick: () => openTab("help") } });
    },
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <MockBanner screen="Student · 390 px" />
      <div className="flex items-center gap-2 border-b border-dashed bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
        Simulate:
        <button type="button" onClick={simulate.topic} className="underline underline-offset-2 hover:text-foreground">
          topic change
        </button>
        <button type="button" onClick={simulate.cluster} className="underline underline-offset-2 hover:text-foreground">
          cluster published
        </button>
      </div>

      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <Brand />
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate">{me.alias}</span>
            <Badge variant="outline" className="font-mono tracking-widest">
              {session.code}
            </Badge>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openTab("topics")}
          className="flex w-full items-center gap-3 border-t bg-primary px-3 py-2 text-left text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
          aria-label={`Current topic: ${active.label}. ${myLevel ? `Your answer: ${LEVELS.find((l) => l.value === myLevel)!.label}` : "Not answered yet"}. Go to topics.`}
        >
          <span className="relative flex size-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground/70 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-primary-foreground" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold tracking-wide uppercase opacity-80">Now</span>
            <span className="block truncate font-heading text-base leading-tight font-semibold">{active.label}</span>
          </span>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", myLevel ? "bg-primary-foreground/20" : "bg-primary-foreground text-primary")}>
            {myLevel ? SHORT[myLevel] : "Answer"}
          </span>
        </button>
      </header>

      <main className="flex-1 space-y-4 px-3 pt-4 pb-6">
        {tab === "topics" && (
          <>
            <section aria-labelledby="current-topic" className="enter space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{session.course} · {session.title}</p>
                <h1 id="current-topic" className="text-2xl font-semibold tracking-tight">
                  {active.label}
                </h1>
                <p className="text-sm text-muted-foreground">{active.description}</p>
              </div>
              <BigConfidence value={myLevel} onChange={(l) => setLevels((s) => ({ ...s, [activeId]: l }))} />
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {myLevel ? (
                  <>
                    <CheckCircle2 className="mr-1 inline size-3.5 text-teal-700" aria-hidden />
                    Saved. Tap again any time — only the class total is shown to your instructor, never your answer.
                  </>
                ) : (
                  "One tap. Only the class total is shown to your instructor, never your answer."
                )}
              </p>
            </section>

            <section aria-labelledby="other-topics" className="space-y-2">
              <h2 id="other-topics" className="px-1 text-sm font-semibold text-muted-foreground">
                Other topics in this lecture
              </h2>
              <ul className="space-y-2">
                {others.map((c, i) => (
                  <li key={c._id}>
                    <Card size="sm" className="enter" style={{ "--i": i + 1 } as React.CSSProperties}>
                      <CardHeader>
                        <CardTitle render={<h3 />}>{c.label}</CardTitle>
                        <CardDescription>{c.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ConfidenceSelector value={levels[c._id]} onChange={(l) => setLevels((s) => ({ ...s, [c._id]: l }))} />
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {tab === "ask" && (
          <section aria-labelledby="ask-heading" className="enter space-y-4">
            <div className="space-y-1">
              <h1 id="ask-heading" className="text-2xl font-semibold tracking-tight">
                Ask a question
              </h1>
              <p className="text-sm text-muted-foreground">Goes to your instructor as {me.alias}. Classmates never see who asked.</p>
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                setSent((s) => [{ _id: `new-${s.length}`, conceptId: askAbout, alias: me.alias, content: draft.trim(), state: "pending", minutesAgo: 0, isSimulated: false, time: "just now" }, ...s]);
                setDraft("");
                setJustSent(true);
              }}
            >
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                About
                <Select
                  items={fixtureConcepts.map((c) => ({ value: c._id, label: c._id === activeId ? `${c.label} (current topic)` : c.label }))}
                  value={askAbout}
                  onValueChange={(v) => v && setAskAbout(v)}
                >
                  <SelectTrigger aria-label="Question topic" className="min-w-0 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fixtureConcepts.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c._id === activeId ? `${c.label} (current topic)` : c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <Textarea
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value.slice(0, 500));
                  setJustSent(false);
                }}
                rows={4}
                placeholder="What's confusing you? Describe it in your own words."
                aria-label="Your question"
                className="resize-none text-base"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs tabular-nums text-muted-foreground">{draft.length}/500</span>
                <Button type="submit" size="lg" disabled={!draft.trim()}>
                  Send anonymously
                  <Send data-icon="inline-end" aria-hidden />
                </Button>
              </div>
              {justSent && (
                <p className="enter flex items-start gap-1.5 text-sm text-teal-700">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Sent to your instructor. It stays private until they publish a group that includes it.
                </p>
              )}
              <p className="rounded-lg border border-dashed bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                Asking is optional. Your instructor sees the question under your alias, not your name, and operators of this service
                could still link it to your device (pseudonymous, not fully anonymous). Question text is sent to an external AI (Claude,
                by Anthropic) to group similar questions — don&apos;t include names or personal details.
              </p>
            </form>

            <section aria-labelledby="your-questions" className="space-y-2">
              <h2 id="your-questions" className="px-1 text-sm font-semibold text-muted-foreground">
                Your questions
              </h2>
              <ul className="space-y-2">
                {sent.map((q) => {
                  const group = published.find((c) => c.questionIds.includes(q._id));
                  return (
                    <li key={q._id} className="rounded-xl border bg-card p-3 text-sm">
                      <p>{q.content}</p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{fixtureConcepts.find((c) => c._id === q.conceptId)?.label}</span>·<span>{q.time}</span>·
                        {group ? (
                          <button type="button" onClick={() => openTab("help")} className="font-medium text-foreground underline underline-offset-2">
                            In group “{group.title}”
                          </button>
                        ) : (
                          <span>With your instructor</span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          </section>
        )}

        {tab === "help" && (
          <section className="enter space-y-5">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
              <p className="text-sm text-muted-foreground">Question groups your instructor published, and rooms where classmates explain things to each other.</p>
            </div>

            <section aria-labelledby="groups" className="space-y-2">
              <h2 id="groups" className="px-1 text-sm font-semibold text-muted-foreground">
                Published question groups ({published.length})
              </h2>
              <ul className="space-y-2">
                {published.map((c, i) => {
                  const room = rooms.find((r) => r.clusterId === c._id);
                  const canHelp = c.conceptIds.find((id) => helping.includes(id));
                  const full = room ? room.members.length >= room.capacity : false;
                  return (
                    <li key={c._id}>
                      <Card className="enter" style={{ "--i": i } as React.CSSProperties}>
                        <CardHeader>
                          {c.publishedMinutesAgo === 0 && <Badge className="mb-1 w-fit">New</Badge>}
                          <CardTitle render={<h3 />}>{c.title}</CardTitle>
                          <CardDescription>{c.summary}</CardDescription>
                          <p className="flex flex-wrap gap-1.5 pt-1">
                            {c.conceptIds.map((id) => (
                              <Badge key={id} variant="secondary">
                                {fixtureConcepts.find((k) => k._id === id)?.label}
                              </Badge>
                            ))}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {room ? (
                            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 p-2 pl-3">
                              <span className="flex min-w-0 items-center gap-2 text-sm">
                                <span className="flex -space-x-2">
                                  {room.members.slice(0, 4).map((m) => (
                                    <Avatar key={m.alias} alias={m.alias} size="sm" />
                                  ))}
                                </span>
                                <span className="truncate tabular-nums text-muted-foreground">
                                  {room.members.length}/{room.capacity} · {room.members.filter((m) => m.role === "helper").length} helper
                                </span>
                              </span>
                              <Button size="sm" disabled={full && !room.members.some((m) => m.isMe)}>
                                {room.members.some((m) => m.isMe) ? "Open" : full ? "Full" : "Join"}
                                <DoorOpen data-icon="inline-end" aria-hidden />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {c.helperCount} classmate{c.helperCount === 1 ? "" : "s"} offered to help · no room open yet
                            </p>
                          )}
                          {canHelp && (
                            <Button variant="outline" size="sm" className="w-full">
                              <HandHelping data-icon="inline-start" aria-hidden />
                              Open a room as helper ({fixtureConcepts.find((k) => k._id === canHelp)?.label})
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="rooms" className="space-y-2">
              <h2 id="rooms" className="px-1 text-sm font-semibold text-muted-foreground">
                Open rooms
              </h2>
              <ul className="space-y-2">
                {rooms.map((r) => (
                  <li key={r._id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {fixtureConcepts.find((c) => c._id === r.conceptId)?.label} · <span className="tabular-nums">{r.members.length}/{r.capacity}</span>
                        {r.members.some((m) => m.isMe) && " · you're in"}
                      </p>
                    </div>
                    <Button size="sm" variant={r.members.some((m) => m.isMe) ? "default" : "outline"} disabled={r.members.length >= r.capacity && !r.members.some((m) => m.isMe)}>
                      {r.members.some((m) => m.isMe) ? "Open" : r.members.length >= r.capacity ? "Full" : "Join"}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>

            <Card aria-labelledby="helper-opt-in">
              <CardHeader>
                <CardTitle id="helper-opt-in" render={<h2 />}>
                  <Users className="mr-1.5 inline size-4 text-blahaj" aria-hidden />
                  I could help with…
                </CardTitle>
                <CardDescription>
                  Your own call, not a test or an AI rating. Nobody is enrolled or contacted automatically: classmates only see you as{" "}
                  <span className="font-medium text-foreground">{me.alias}</span> in a room you choose to open or join. Untick any time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2">
                  {fixtureConcepts.map((c) => {
                    const checked = helping.includes(c._id);
                    return (
                      <li key={c._id}>
                        <label
                          className={cn(
                            "pressable flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                            checked ? "border-teal-300 bg-teal-50 text-teal-950" : "border-border bg-background hover:bg-muted",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => setHelping((h) => (v === true ? [...h, c._id] : h.filter((id) => id !== c._id)))}
                            className={cn(checked && "border-teal-700 bg-teal-700 text-white data-checked:border-teal-700 data-checked:bg-teal-700")}
                          />
                          {c.label}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      <nav aria-label="Sections" className="sticky bottom-0 z-20 w-full border-t bg-card/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
        <div role="tablist" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
          {TABS.map((t) => {
            const on = tab === t.id;
            const badge = t.id === "help" ? unseenHelp : 0;
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={on}
                onClick={() => openTab(t.id)}
                className={cn(
                  "pressable relative flex min-h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  on ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="size-4" aria-hidden />
                {t.label}
                {badge > 0 && (
                  <span className="absolute top-1 right-3 grid size-4 place-items-center rounded-full bg-blahaj-pink text-[10px] font-bold text-white" aria-label={`${badge} new`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {tab !== "topics" && (
        <button
          type="button"
          onClick={() => openTab("topics")}
          className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:bottom-24 focus:rounded-full focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
        >
          <ArrowUp className="mr-1 inline size-3.5" aria-hidden />
          Back to current topic
        </button>
      )}

      <Toast toast={toast} onDismiss={dismiss} className="bottom-24" />
    </div>
  );
}

/** Three big icon buttons for the current topic. Thumb-sized (min 72 px tall), short label, colour only as a secondary cue. */
function BigConfidence({ value, onChange }: { value: Level | null; onChange: (l: Level) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={`How well do you understand this?`}>
      {LEVELS.map((l) => {
        const Icon = ICONS[l.value];
        const on = value === l.value;
        return (
          <button
            key={l.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(l.value)}
            className={cn(
              "pressable flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              on ? l.selected : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            <Icon className={cn("size-7", !on && l.value === "confused" && "text-rose-500", !on && l.value === "partial" && "text-amber-500", !on && l.value === "can_explain" && "text-teal-600")} strokeWidth={2.2} aria-hidden />
            {SHORT[l.value]}
            <span className="sr-only">{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}
