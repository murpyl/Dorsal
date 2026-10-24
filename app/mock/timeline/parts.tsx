"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LEVELS, type Level } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { conceptLabel, type Cluster, type Room } from "./fixtures";

/** Shared presentational pieces for the Timeline mockup screens (no data fetching). */

export function LevelChip({ level, className }: { level: Level | null | undefined; className?: string }) {
  const l = LEVELS.find((x) => x.value === level);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
      <span className={cn("size-2 rounded-full", l ? l.dot : "border border-border bg-background")} aria-hidden />
      {l ? l.label : "Not answered"}
    </span>
  );
}

export function ConceptChips({ ids, activeId }: { ids: string[]; activeId?: string | null }) {
  return (
    <>
      {ids.map((id) => (
        <Badge key={id} variant={id === activeId ? "default" : "secondary"}>
          {conceptLabel(id)}
        </Badge>
      ))}
    </>
  );
}

export const roomCount = (r: Pick<Room, "members" | "capacity">) => `${r.members.length} / ${r.capacity}`;
export const roomHelpers = (r: Pick<Room, "members">) => r.members.filter((m) => m.role === "helper").length;
export const roomFull = (r: Pick<Room, "members" | "capacity">) => r.members.length >= r.capacity;

export function clusterMeta(c: Cluster) {
  return `${c.questionIds.length} question${c.questionIds.length === 1 ? "" : "s"} · ${c.helperCount} helper${c.helperCount === 1 ? "" : "s"} opted in`;
}

/**
 * One row of a timeline: a time gutter, a rail with a marker, and the body.
 * `tone` colours the marker so event types are distinguishable at a glance (and the icon/label carries the meaning for screen readers).
 */
export function TimelineItem({
  time,
  tone = "muted",
  icon,
  label,
  children,
  isNew,
  className,
  style,
}: {
  time: string;
  tone?: "muted" | "topic" | "cluster" | "room" | "me";
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
  isNew?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const marker = {
    muted: "bg-muted text-muted-foreground ring-border",
    topic: "bg-primary text-primary-foreground ring-primary/30",
    cluster: "bg-amber-100 text-amber-900 ring-amber-200",
    room: "bg-teal-100 text-teal-900 ring-teal-200",
    me: "bg-foreground text-background ring-foreground/20",
  }[tone];
  return (
    <li className={cn("enter relative grid grid-cols-[2.75rem_1.75rem_1fr] gap-x-2", className)} style={style}>
      <time className="pt-1.5 text-right font-mono text-[11px] text-muted-foreground tabular-nums">{time}</time>
      <div className="relative flex justify-center">
        <span className="absolute inset-y-0 w-px bg-border" aria-hidden />
        <span className={cn("relative z-10 mt-1 grid size-6 place-items-center rounded-full ring-2 [&_svg]:size-3.5", marker)} aria-hidden>
          {icon}
        </span>
      </div>
      <div className="min-w-0 pb-5">
        <p className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
          {isNew && <Badge className="h-4 px-1.5 text-[10px]">new</Badge>}
        </p>
        {children}
      </div>
    </li>
  );
}

export function NewDivider({ label, ref }: { label: string; ref?: React.Ref<HTMLLIElement> }) {
  return (
    <li ref={ref} className="relative my-1 flex scroll-mt-72 items-center gap-3 pl-[2.75rem]" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-primary/40" />
      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">{label}</span>
      <span className="h-px flex-1 bg-primary/40" />
    </li>
  );
}

/** Small cross-links between the three mock screens; rendered only in the mock index, never on the screens themselves. */
export function MockNav() {
  return (
    <nav className="flex flex-wrap gap-2 text-sm" aria-label="Timeline mock screens">
      {[
        ["/mock/timeline/student", "Student"],
        ["/mock/timeline/instructor", "Instructor"],
        ["/mock/timeline/room", "Peer room"],
      ].map(([href, label]) => (
        <Link key={href} href={href} className="rounded-full border bg-card px-3 py-1 hover:bg-muted">
          {label}
        </Link>
      ))}
    </nav>
  );
}
