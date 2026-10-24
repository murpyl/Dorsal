"use client";

import { Background, BackgroundVariant, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export const LOW_SAMPLE = 5;

type Counts = { confused: number; partial: number; can_explain: number };
export type GraphConcept = { _id: string; label: string; x: number; y: number; counts: Counts; total: number; openClusters: number };
export type GraphEdge = { _id: string; fromId: string; toId: string };

type ConceptNodeData = {
  label: string;
  total: number;
  score: number | null;
  active: boolean;
  selected: boolean;
  openClusters: number;
  counts: Counts;
  onSelect: (id: string) => void;
};
type ConceptNode = Node<ConceptNodeData, "concept">;

export function understandingScore(c: { counts: Counts; total: number }) {
  return c.total === 0 ? null : (c.counts.partial * 0.5 + c.counts.can_explain) / c.total;
}

/** Clay → ochre → moss on the understanding score (oklch hue 36 → 135); soft fill, earthy accent bar. */
export function scoreColors(score: number | null) {
  if (score === null) return { fill: "var(--color-neutral-100)", accent: "var(--color-neutral-400)" };
  const hue = Math.round(36 + score * 99);
  return { fill: `oklch(0.95 0.035 ${hue})`, accent: `oklch(0.56 0.11 ${hue})` };
}

function ConceptNodeView({ id, data }: NodeProps<ConceptNode>) {
  const { label, total, score, active, selected, openClusters, counts, onSelect } = data;
  const { fill, accent } = scoreColors(score);
  const low = total < LOW_SAMPLE;
  const description = [
    `${label}.`,
    total === 0
      ? "No responses yet."
      : `N = ${total}: ${counts.confused} confused, ${counts.partial} partly get it, ${counts.can_explain} can explain.`,
    low && total > 0 ? "Low sample." : "",
    openClusters > 0 ? `${openClusters} published cluster${openClusters === 1 ? "" : "s"}.` : "",
    active ? "Current topic." : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={description}
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(id);
        }
      }}
      className={cn(
        "pressable relative w-48 cursor-pointer overflow-visible rounded-xl border-2 bg-card px-3 py-2.5 text-left text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        low ? "border-dashed border-neutral-300" : "border-neutral-200",
        active && "ring-4 ring-foreground/15 border-foreground",
        selected && "border-foreground",
      )}
      style={{ background: fill }}
      data-testid="concept-node"
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      {openClusters > 0 && (
        <span
          className="absolute -top-2.5 -right-2.5 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white"
          title={`${openClusters} published question cluster${openClusters === 1 ? "" : "s"} touch this concept`}
        >
          {openClusters} cluster{openClusters === 1 ? "" : "s"}
        </span>
      )}
      <div className="flex items-start gap-2">
        <span className="mt-1 h-7 w-1 shrink-0 rounded-full" style={{ background: accent }} aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            N = {total}
            {low && <span className="ml-1">· {total === 0 ? "no responses" : "low sample"}</span>}
          </p>
        </div>
      </div>
      {active && <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-foreground uppercase">current topic</p>}
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { concept: ConceptNodeView };

export function ConceptGraph({
  concepts,
  edges,
  activeConceptId,
  selectedId,
  onSelect,
}: {
  concepts: GraphConcept[];
  edges: GraphEdge[];
  activeConceptId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const nodes = useMemo<ConceptNode[]>(
    () =>
      concepts.map((c) => ({
        id: c._id,
        type: "concept",
        position: { x: c.x, y: c.y },
        data: {
          label: c.label,
          total: c.total,
          score: understandingScore(c),
          active: c._id === activeConceptId,
          selected: c._id === selectedId,
          openClusters: c.openClusters,
          counts: c.counts,
          onSelect,
        },
      })),
    [concepts, activeConceptId, selectedId, onSelect],
  );
  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => ({
        id: e._id,
        source: e.fromId,
        target: e.toId,
        markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-neutral-400)" },
        label: "prerequisite",
        labelStyle: { fontSize: 10, fill: "var(--color-muted-foreground)" },
        labelBgStyle: { fill: "var(--color-background)" },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
      })),
    [edges],
  );

  return (
    <figure className="flex flex-col overflow-hidden rounded-xl bg-card text-sm ring-1 ring-foreground/10">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b px-4 py-2.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Self-reported understanding</span>
        <span className="flex items-center gap-1.5">
          confused
          <span
            className="inline-block h-1.5 w-16 rounded-full"
            style={{ background: `linear-gradient(to right, ${scoreColors(0).accent}, ${scoreColors(0.5).accent}, ${scoreColors(1).accent})` }}
            aria-hidden
          />
          can explain
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block size-3 rounded border"
            style={{ background: scoreColors(null).fill, borderColor: scoreColors(null).accent }}
            aria-hidden
          />{" "}
          no responses
        </span>
        <span>dashed border = N &lt; {LOW_SAMPLE}</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white" aria-hidden>
            n clusters
          </span>
          published question clusters on this concept
        </span>
        <span>Student confidence, not measured mastery</span>
        <a href="#per-concept" className="text-foreground underline underline-offset-3 hover:text-muted-foreground">
          Text version: per-concept distribution
        </a>
      </figcaption>
      <div className="h-80 lg:h-[26rem]">
        <ReactFlow
          nodes={nodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => onSelect(node.id)}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          elementsSelectable={false}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="var(--color-neutral-300)" />
        </ReactFlow>
      </div>
    </figure>
  );
}
