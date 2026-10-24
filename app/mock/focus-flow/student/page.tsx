"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, CheckCircle2, CornerDownLeft, DoorOpen, HandHelping, MessageCircleQuestion, Send, X } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ConfidenceSelector } from "@/components/ConfidenceSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEVELS, type Level } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { clusters, conceptById, concepts, myLevels as initialLevels, rooms as initialRooms, session } from "../fixtures";

const MAX_LENGTH = 400;

export default function FocusFlowStudent() {
  const [viewingId, setViewingId] = useState(session.activeConceptId);
  const [levels, setLevels] = useState(initialLevels);
  const [rooms, setRooms] = useState(initialRooms);
  const [helping, setHelping] = useState<string[]>(session.me.helperConceptIds);
  const [announcement, setAnnouncement] = useState<{ text: string; conceptId: string } | null>({
    text: "A help room opened for “What happens without a base case”",
    conceptId: "c1",
  });
  const [sheet, setSheet] = useState<"ask" | "help" | null>(null);
  const touchX = useRef<number | null>(null);

  const viewing = conceptById(viewingId)!;
  const current = conceptById(session.activeConceptId)!;
  const isCurrent = viewingId === session.activeConceptId;
  const index = concepts.findIndex((c) => c._id === viewingId);
  const myLevel = levels[viewingId];
  const published = clusters.filter((k) => k.status === "published" && k.conceptIds.includes(viewingId));
  const conceptRooms = rooms.filter((r) => r.conceptId === viewingId);
  const iHelpHere = helping.includes(viewingId);

  const go = (delta: number) => setViewingId(concepts[Math.min(concepts.length - 1, Math.max(0, index + delta))]._id);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
          <Brand />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden min-[360px]:inline">{session.me.alias}</span>
            <Badge variant="outline" className="font-mono tracking-widest">
              {session.code}
            </Badge>
          </div>
        </div>
        <div
          role="tablist"
          aria-label="Concepts in this lecture"
          className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
        >
          {concepts.map((c) => {
            const selected = c._id === viewingId;
            const active = c._id === session.activeConceptId;
            const mine = levels[c._id];
            const dot = LEVELS.find((l) => l.value === mine)?.dot;
            return (
              <button
                key={c._id}
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setViewingId(c._id)}
                className={cn(
                  "pressable flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                {active ? (
                  <span className="relative flex size-2" aria-label="current topic">
                    <span className={cn("absolute inline-flex size-full animate-ping rounded-full motion-reduce:hidden", selected ? "bg-background/70" : "bg-primary/70")} />
                    <span className={cn("relative inline-flex size-2 rounded-full", selected ? "bg-background" : "bg-primary")} />
                  </span>
                ) : (
                  <span
                    className={cn("size-2 rounded-full", dot ?? "border border-current opacity-50")}
                    aria-label={mine ? `your answer: ${LEVELS.find((l) => l.value === mine)?.label}` : "not answered"}
                  />
                )}
                {c.label}
                {active && <span className={cn("text-[11px] font-semibold uppercase", selected ? "text-background/70" : "text-primary")}>now</span>}
              </button>
            );
          })}
        </div>
      </header>

      <div aria-live="polite" className="px-4 pt-3 empty:hidden">
        {announcement && (
          <div className="enter flex items-start gap-2 rounded-xl border border-primary/30 bg-accent px-3 py-2 text-sm">
            <DoorOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p className="min-w-0 flex-1">
              {announcement.text} ·{" "}
              <button
                type="button"
                className="font-semibold underline underline-offset-3"
                onClick={() => {
                  setViewingId(announcement.conceptId);
                  setAnnouncement(null);
                }}
              >
                View
              </button>
            </p>
            <Button size="icon-xs" variant="ghost" aria-label="Dismiss" onClick={() => setAnnouncement(null)}>
              <X aria-hidden />
            </Button>
          </div>
        )}
      </div>

      <section
        key={viewingId}
        aria-label={viewing.label}
        className="enter flex flex-1 flex-col gap-5 px-4 pt-4 pb-6"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {isCurrent ? (
          <Badge className="w-fit">
            <span className="relative flex size-1.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground/70 motion-reduce:hidden" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary-foreground" />
            </span>
            Current topic
          </Badge>
        ) : (
          <button
            type="button"
            onClick={() => setViewingId(session.activeConceptId)}
            className="pressable flex w-fit items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <CornerDownLeft className="size-3.5" aria-hidden />
            Back to current topic: {current.label}
          </button>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {session.course} · concept {index + 1} of {concepts.length}
          </p>
          <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-tight text-balance">{viewing.label}</h1>
          <p className="text-[15px] leading-relaxed text-pretty text-muted-foreground">{viewing.description}</p>
        </div>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {myLevel ? (
            <>
              Your answer: <span className="font-semibold text-foreground">{LEVELS.find((l) => l.value === myLevel)?.label}</span>. Tap below to
              change it.
            </>
          ) : (
            <>Not answered yet — only you can see what you pick.</>
          )}
        </p>

        <div className="space-y-2.5">
          <h2 className="text-sm font-semibold">What the class is asking about {viewing.label}</h2>
          {published.length === 0 ? (
            <p className="rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground">
              Nothing published yet. Your instructor reviews questions before any group appears here.
            </p>
          ) : (
            <ul className="space-y-2">
              {published.map((k) => {
                const krooms = rooms.filter((r) => r.clusterId === k._id);
                return (
                  <li key={k._id} className="space-y-2 rounded-xl border bg-card p-3">
                    <div className="space-y-0.5">
                      <h3 className="font-medium">{k.title}</h3>
                      <p className="text-sm text-muted-foreground">{k.summary}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {k.questionIds.length} questions · {k.helperCount} helper{k.helperCount === 1 ? "" : "s"} opted in
                    </p>
                    {krooms.map((r) => (
                      <div key={r._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                        <span>
                          <span className="font-medium">{r.title}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {" "}
                            · {r.memberCount} / {r.capacity}
                          </span>
                        </span>
                        {r.isMember ? (
                          <Button size="sm" nativeButton={false} render={<Link href="/mock/focus-flow/room" />}>
                            Open ({r.myRole})
                            <ArrowRight data-icon="inline-end" aria-hidden />
                          </Button>
                        ) : r.memberCount >= r.capacity ? (
                          <Badge variant="secondary">Full</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRooms((rs) =>
                                rs.map((x) =>
                                  x._id === r._id
                                    ? { ...x, isMember: true, myRole: helping.includes(x.conceptId) ? "helper" : "learner", memberCount: x.memberCount + 1 }
                                    : x,
                                ),
                              )
                            }
                          >
                            {helping.includes(r.conceptId) ? "Join as helper" : "Join"}
                          </Button>
                        )}
                      </div>
                    ))}
                  </li>
                );
              })}
            </ul>
          )}
          {iHelpHere && conceptRooms.length === 0 && (
            <p className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-950">
              <HandHelping className="size-4 shrink-0" aria-hidden />
              You volunteered to help with {viewing.label}. A room appears here when one opens.
            </p>
          )}
        </div>
      </section>

      <Dialog.Root open={sheet !== null} onOpenChange={(open) => !open && setSheet(null)}>
        <Dialog.Trigger
          onClick={() => setSheet("ask")}
          className="pressable fixed right-4 bottom-[9.25rem] z-30 inline-flex h-12 items-center gap-2 rounded-full border border-foreground bg-foreground pr-4 pl-3.5 text-sm font-semibold text-background outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:right-[calc(50%-13rem)]"
          aria-label="Ask a question or volunteer to help"
        >
          <MessageCircleQuestion className="size-5" aria-hidden />
          Ask · help
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/20 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl border border-b-0 bg-card text-card-foreground outline-none duration-200 data-open:animate-in data-open:slide-in-from-bottom-6 data-open:fade-in-0 data-closed:animate-out data-closed:slide-out-to-bottom-6 data-closed:fade-out-0">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" aria-hidden />
            {sheet && (
              <Tabs.Root value={sheet} onValueChange={(v) => setSheet(v as "ask" | "help")} className="flex min-h-0 flex-col">
                <div className="flex items-center justify-between gap-2 px-4 pt-3">
                  <Tabs.List className="grid flex-1 grid-cols-2 gap-1 rounded-full bg-muted p-1" aria-label="Ask or help">
                    {(
                      [
                        ["ask", "Ask a question", MessageCircleQuestion],
                        ["help", "Help others", HandHelping],
                      ] as const
                    ).map(([v, label, Icon]) => (
                      <Tabs.Tab
                        key={v}
                        value={v}
                        className="flex h-9 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-active:bg-card data-active:text-foreground"
                      >
                        <Icon className="size-4" aria-hidden />
                        {label}
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>
                  <Dialog.Close render={<Button variant="ghost" size="icon" aria-label="Close" />}>
                    <X aria-hidden />
                  </Dialog.Close>
                </div>
                <div className="min-h-0 overflow-y-auto px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
                  <Tabs.Panel value="ask">
                    <AskForm defaultConceptId={viewingId} />
                  </Tabs.Panel>
                  <Tabs.Panel value="help">
                    <HelpForm helping={helping} onChange={setHelping} />
                  </Tabs.Panel>
                </div>
              </Tabs.Root>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <footer className="sticky bottom-0 z-20 border-t bg-card px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <p className="mb-2 px-1 text-xs font-medium text-muted-foreground" id="focus-question">
          How well do you follow <span className="font-semibold text-foreground">{viewing.label}</span> right now?
        </p>
        <div className="[&_button]:min-h-[4.25rem] [&_button]:rounded-2xl [&_button]:text-[15px]" aria-describedby="focus-question">
          <ConfidenceSelector value={myLevel} onChange={(level: Level) => setLevels((m) => ({ ...m, [viewingId]: level }))} />
        </div>
      </footer>
    </main>
  );
}

function AskForm({ defaultConceptId }: { defaultConceptId: string }) {
  const [conceptId, setConceptId] = useState(defaultConceptId);
  const [content, setContent] = useState("");
  const [sent, setSent] = useState(false);
  const items = concepts.map((c) => ({ value: c._id, label: c._id === session.activeConceptId ? `${c.label} (current topic)` : c.label }));
  const trimmed = content.trim();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed) return;
        setSent(true);
        setContent("");
      }}
    >
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        About
        <Select items={items} value={conceptId} onValueChange={(v) => v && setConceptId(v)}>
          <SelectTrigger size="sm" aria-label="Question topic" className="max-w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
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
          setContent(e.target.value.slice(0, MAX_LENGTH));
          setSent(false);
        }}
        rows={4}
        autoFocus
        placeholder="What's confusing you? Describe it in your own words."
        aria-label="Your question"
        className="resize-none text-base"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {content.length}/{MAX_LENGTH}
        </span>
        <Button type="submit" size="lg" disabled={!trimmed}>
          Send anonymously
          <Send data-icon="inline-end" aria-hidden />
        </Button>
      </div>
      {sent && (
        <p className="enter flex items-start gap-1.5 text-sm text-teal-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          Sent to your instructor. It stays private until they publish a group that includes it.
        </p>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Asking is optional. Classmates never see who asked; your instructor sees the question under your alias{" "}
        <span className="font-medium text-foreground">{session.me.alias}</span>, not your name, and operators of this service could still link it to
        your device (pseudonymous, not fully anonymous). Question text is sent to an external AI (Claude, by Anthropic) to group similar questions
        — don&apos;t include names or personal details.
      </p>
    </form>
  );
}

function HelpForm({ helping, onChange }: { helping: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Tick the topics you feel comfortable explaining. This is your own call, not a test or an AI rating. Nobody is enrolled or contacted
        automatically: classmates only see you as <span className="font-medium text-foreground">{session.me.alias}</span> in a help room you
        choose to open or join, and you can untick at any time.
      </p>
      <ul className="grid gap-2">
        {concepts.map((c) => {
          const checked = helping.includes(c._id);
          return (
            <li key={c._id}>
              <label
                className={cn(
                  "pressable flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  checked ? "border-teal-300 bg-teal-50 text-teal-950" : "border-border bg-background hover:bg-muted",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => onChange(v ? [...helping, c._id] : helping.filter((id) => id !== c._id))}
                  className={cn("size-5", checked && "border-teal-600 bg-teal-600 text-white data-checked:border-teal-600 data-checked:bg-teal-600")}
                />
                <span>
                  I can help with <span className="font-medium">{c.label}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
