"use client";

import { Background, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";

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

function ConceptNodeView({ id, data }: NodeProps<ConceptNode>) {
  const { label, total, score, active, selected, openClusters, counts, onSelect } = data;
  const fill = score === null ? "#e4e4e7" : `hsl(${Math.round(score * 130)} 75% 60%)`;
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
      className={`relative w-48 rounded-xl px-3 py-2 text-center text-zinc-900 shadow-sm focus:outline-2 focus:outline-offset-2 focus:outline-indigo-700 ${low ? "border-2 border-dashed border-zinc-500" : "border-2 border-zinc-700"} ${active ? "ring-4 ring-indigo-400" : ""} ${selected ? "outline-2 outline-offset-2 outline-zinc-900" : ""}`}
      style={{ background: fill }}
      data-testid="concept-node"
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      {openClusters > 0 && (
        <span
          className="absolute -top-2.5 -right-2.5 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white shadow"
          title={`${openClusters} published question cluster${openClusters === 1 ? "" : "s"} touch this concept`}
        >
          {openClusters} cluster{openClusters === 1 ? "" : "s"}
        </span>
      )}
      <p className="font-medium">{label}</p>
      <p className="text-xs">
        N = {total}
        {low && <span className="ml-1">· {total === 0 ? "no responses" : "low sample"}</span>}
      </p>
      {active && <p className="text-xs font-semibold text-indigo-900">current topic</p>}
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
        markerEnd: { type: MarkerType.ArrowClosed },
        label: "prerequisite",
        labelStyle: { fontSize: 10 },
      })),
    [edges],
  );

  return (
    <figure className="flex flex-col rounded-xl border border-zinc-200 bg-white">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-200 px-3 py-2 text-xs text-zinc-600">
        <span className="font-semibold text-zinc-800">Self-reported understanding</span>
        <span className="flex items-center gap-1">
          confused
          <span
            className="inline-block h-2 w-16 rounded-full"
            style={{ background: "linear-gradient(to right, hsl(0 75% 60%), hsl(65 75% 60%), hsl(130 75% 60%))" }}
            aria-hidden
          />
          can explain
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border border-zinc-500 bg-zinc-200" aria-hidden /> no responses
        </span>
        <span>dashed border = N &lt; {LOW_SAMPLE}</span>
        <span className="flex items-center gap-1">
          <span className="inline-block rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white" aria-hidden>
            n clusters
          </span>
          published question clusters on this concept
        </span>
        <span>Student confidence, not measured mastery</span>
        <a href="#per-concept" className="text-indigo-700 underline">
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
        <Background />
      </ReactFlow>
      </div>
    </figure>
  );
}
