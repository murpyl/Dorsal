"use client";

import { useState } from "react";
import { ArrowRight, Bell, CheckCircle2, Send, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Level } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { CLUSTERS, CONCEPTS, ME, ROOMS, SESSION, conceptById } from "../fixtures";
import { Brand, LivePill, MockBar, SHORT_LEVEL, SegmentedLevel } from "../parts";

const MAX_LENGTH = 500;

export default function StudentDenseTable() {
  const [levels, setLevels] = useState<Record<string, Level | null>>(Object.fromEntries(CONCEPTS.map((c) => [c._id, c.myLevel])));
  const [helping, setHelping] = useState<string[]>(ME.helperConceptIds);
  const [open, setOpen] = useState<string[]>(["ask", "clusters"]);
  const [notice, setNotice] = useState<{ text: string; section: string } | null>({
    text: "New question group published: “Why tree recursion is slow”",
    section: "clusters",
  });
  const [draft, setDraft] = useState("");
  const [askAbout, setAskAbout] = useState(SESSION.activeConceptId);
  const [sent, setSent] = useState(false);

  const active = conceptById(SESSION.activeConceptId);
  const answered = Object.values(levels).filter(Boolean).length;
  const items = CONCEPTS.map((c) => ({ value: c._id, label: c._id === SESSION.activeConceptId ? `${c.label} (current topic)` : c.label }));
  const published = CLUSTERS.filter((c) => c.status === "published");

  function setLevel(id: string, level: Level) {
    setLevels((prev) => ({ ...prev, [id]: level }));
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <MockBar screen="student" viewport="390 × 844" />
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <Brand />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="hidden min-[360px]:inline">{ME.alias}</span>
            <Badge variant="outline" className="font-mono tracking-widest">
              {SESSION.code}
            </Badge>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 bg-primary px-3 py-1.5 text-primary-foreground">
          <p className="flex min-w-0 items-center gap-2 text-sm">
            <span className="shrink-0 text-[11px] font-semibold tracking-wide uppercase opacity-80">Now</span>
            <span className="truncate font-heading font-medium">{active.label}</span>
          </p>
          <span className="shrink-0 text-xs tabular-nums opacity-80">
            {answered}/{CONCEPTS.length} answered
          </span>
        </div>
      </header>

      <main className="flex-1 space-y-3 px-3 pt-3 pb-10">
        {notice && (
          <div role="status" className="enter flex items-center gap-2 rounded-lg border border-primary/30 bg-accent px-2.5 py-1.5 text-xs text-accent-foreground">
            <Bell className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{notice.text}</span>
            <button
              type="button"
              className="shrink-0 font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => {
                setOpen((o) => (o.includes(notice.section) ? o : [...o, notice.section]));
                document.getElementById(`section-${notice.section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                setNotice(null);
              }}
            >
              View
            </button>
            <button type="button" aria-label="Dismiss" className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted" onClick={() => setNotice(null)}>
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        )}

        <section aria-label="Concepts" className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-baseline justify-between border-b px-3 py-1.5 text-xs text-muted-foreground">
            <span className="truncate">{SESSION.title}</span>
            <span className="shrink-0">tap to change any time</span>
          </div>
          <ol className="divide-y">
            {CONCEPTS.map((c) => {
              const isActive = c._id === SESSION.activeConceptId;
              const mine = levels[c._id];
              return (
                <li key={c._id} className={cn("space-y-1.5 px-3", isActive ? "bg-accent/60 py-3" : "py-2")}>
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className={cn("flex items-center gap-2 font-heading leading-tight", isActive ? "text-base font-semibold" : "text-sm font-medium")}>
                      {c.label}
                      {isActive && <LivePill>Current topic</LivePill>}
                    </h2>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{mine ? SHORT_LEVEL[mine] : "not answered"}</span>
                  </div>
                  {isActive && <p className="text-xs text-muted-foreground">{c.description}</p>}
                  <SegmentedLevel value={mine} onChange={(l) => setLevel(c._id, l)} size={isActive ? "lg" : "sm"} label={c.label} />
                </li>
              );
            })}
          </ol>
          <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">Only you see your answers. The class only sees groups your instructor publishes.</p>
        </section>

        <Accordion multiple value={open} onValueChange={(v) => setOpen(v as string[])} className="overflow-hidden rounded-xl border bg-card">
          <AccordionItem value="ask" id="section-ask" className="px-3">
            <AccordionTrigger className="hover:no-underline">
              <SectionTitle title="Ask a question" hint="anonymous to classmates" />
            </AccordionTrigger>
            <AccordionContent>
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  setDraft("");
                  setSent(true);
                }}
              >
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  about
                  <Select items={items} value={askAbout} onValueChange={(v) => v && setAskAbout(v)}>
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
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value.slice(0, MAX_LENGTH));
                    setSent(false);
                  }}
                  rows={2}
                  maxLength={MAX_LENGTH}
                  placeholder="What's confusing you? Describe it in your own words."
                  aria-label="Your question"
                  className="resize-none text-sm"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] tabular-nums text-muted-foreground" aria-live="polite">
                    {draft.length}/{MAX_LENGTH}
                  </span>
                  <Button type="submit" size="sm" disabled={!draft.trim()}>
                    Send anonymously
                    <Send data-icon="inline-end" aria-hidden />
                  </Button>
                </div>
                {sent && (
                  <p className="enter flex items-start gap-1.5 text-xs text-teal-700">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    Sent to your instructor. It stays private until they publish a group that includes it.
                  </p>
                )}
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Asking is optional. Classmates never see who asked; your instructor sees the question under your alias, not your name, and
                  operators of this service could still link it to your device (pseudonymous, not fully anonymous). Question text is sent to an
                  external AI (Claude, by Anthropic) to group similar questions — don&apos;t include names or personal details.
                </p>
              </form>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="clusters" id="section-clusters" className="px-3">
            <AccordionTrigger className="hover:no-underline">
              <SectionTitle title="What the class is asking" hint="reviewed by your instructor" count={published.length} fresh />
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2">
                {published.map((c) => {
                  const rooms = ROOMS.filter((r) => r.clusterId === c._id);
                  const helperConcept = c.conceptIds.find((id) => helping.includes(id));
                  return (
                    <li key={c._id} className="space-y-1.5 rounded-lg border bg-background p-2.5">
                      <div>
                        <h3 className="text-sm font-medium">{c.title}</h3>
                        <p className="text-xs text-muted-foreground">{c.summary}</p>
                      </div>
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        {c.conceptIds.map((id) => (
                          <Badge key={id} variant="secondary">
                            {conceptById(id).label}
                          </Badge>
                        ))}
                        <span>{c.questionIds.length} questions</span>
                        <span>{c.helperCount} helpers opted in</span>
                      </p>
                      {rooms.map((r) => (
                        <div key={r._id} className="flex items-center justify-between gap-2 rounded-md bg-muted px-2.5 py-1.5 text-xs">
                          <span className="min-w-0">
                            <span className="font-medium">{r.title}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              · {r.memberCount}/{r.capacity} · {r.helperCount} helper
                            </span>
                          </span>
                          {r.isMember ? (
                            <Button size="xs">
                              Open
                              <ArrowRight data-icon="inline-end" aria-hidden />
                            </Button>
                          ) : r.memberCount >= r.capacity ? (
                            <Badge variant="secondary">Full</Badge>
                          ) : (
                            <Button size="xs" variant="outline">
                              Join
                            </Button>
                          )}
                        </div>
                      ))}
                      {helperConcept && (
                        <Button size="xs" className="bg-teal-700 text-white hover:bg-teal-800">
                          Open a room as helper ({conceptById(helperConcept).label})
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="rooms" id="section-rooms" className="px-3">
            <AccordionTrigger className="hover:no-underline">
              <SectionTitle title="Help rooms" hint="small live chats, max 6" count={ROOMS.filter((r) => r.status === "open").length} />
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1.5">
                {ROOMS.map((r) => (
                  <li key={r._id} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-2.5 py-2 text-xs">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{r.title}</span>
                      <span className="text-muted-foreground">
                        {conceptById(r.conceptId).label} · {r.memberCount}/{r.capacity} · {r.helperCount} helper
                      </span>
                    </span>
                    {r.isMember ? (
                      <Button size="sm">Open ({r.myRole})</Button>
                    ) : (
                      <Button size="sm" variant="outline">
                        {helping.includes(r.conceptId) ? "Join as helper" : "Join"}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">Join only if you want to; you can leave any time.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="help" id="section-help" className="px-3">
            <AccordionTrigger className="hover:no-underline">
              <SectionTitle title="I can help with…" hint="your own call, not a test" count={helping.length} />
            </AccordionTrigger>
            <AccordionContent>
              <ul className="grid grid-cols-2 gap-1.5">
                {CONCEPTS.map((c) => {
                  const checked = helping.includes(c._id);
                  return (
                    <li key={c._id}>
                      <label
                        className={cn(
                          "pressable flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                          checked ? "border-teal-300 bg-teal-50 text-teal-950" : "bg-background hover:bg-muted",
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
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Nobody is enrolled or contacted automatically: classmates only see you as <span className="font-medium text-foreground">{ME.alias}</span> in a
                help room you choose to open or join, and you can untick at any time.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>
    </div>
  );
}

function SectionTitle({ title, hint, count, fresh }: { title: string; hint: string; count?: number; fresh?: boolean }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="min-w-0">
        <span className="block font-heading text-sm font-medium">{title}</span>
        <span className="block text-[11px] font-normal text-muted-foreground">{hint}</span>
      </span>
      {count !== undefined && (
        <Badge variant={fresh ? "default" : "secondary"} className="ml-auto mr-2 tabular-nums">
          {count}
          {fresh && <span className="sr-only"> (new)</span>}
        </Badge>
      )}
    </span>
  );
}
