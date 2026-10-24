"use client";

import { Background, BackgroundVariant, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { LOW_SAMPLE, scoreColors, understandingScore, type GraphConcept, type GraphEdge } from "@/components/ConceptGraph";
import { cn } from "@/lib/utils";

type Data = GraphConcept & { active: boolean; selected: boolean; score: number | null; onSelect: (id: string) => void };
type BigNode = Node<Data, "big">;

/** Oversized concept node: readable from the back row of a lecture hall. Colour + N only; no level breakdown on the projector. */
function BigNodeView({ id, data }: NodeProps<BigNode>) {
  const { label, total, score, active, selected, openClusters, counts, onSelect } = data;
  const { fill, accent } = scoreColors(score);
  const low = total < LOW_SAMPLE;
  const description = [
    `${label}.`,
    total === 0 ? "No responses yet." : `N = ${total}: ${counts.confused} confused, ${counts.partial} partly get it, ${counts.can_explain} can explain.`,
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
        "pressable relative w-64 cursor-pointer rounded-2xl border-[3px] bg-card px-4 py-3.5 text-left text-foreground outline-none focus-visible:ring-4 focus-visible:ring-ring/50",
        low ? "border-dashed border-border" : "border-border",
        selected && "border-foreground",
        active && "border-primary ring-8 ring-primary/20",
      )}
      style={{ background: fill }}
      data-testid="projector-node"
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      {openClusters > 0 && (
        <span className="absolute -top-3.5 -right-3 rounded-full bg-amber-500 px-3 py-1 text-sm font-bold text-white">
          {openClusters} cluster{openClusters === 1 ? "" : "s"}
        </span>
      )}
      {active && (
        <span className="absolute -top-3.5 left-5 rounded-full bg-primary px-3 py-1 text-xs font-bold tracking-wide text-primary-foreground uppercase">
          Now
        </span>
      )}
      <div className="flex items-center gap-4">
        <span className="h-14 w-2 shrink-0 rounded-full" style={{ background: accent }} aria-hidden />
        <div className="min-w-0">
          <p className="font-heading text-2xl leading-[1.1] font-semibold text-balance">{label}</p>
          <p className="text-base tabular-nums text-muted-foreground">
            N = {total}
            {low && <span className="ml-1.5">· {total === 0 ? "no responses" : "low sample"}</span>}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { big: BigNodeView };

export function ProjectorGraph({
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
  const nodes = useMemo<BigNode[]>(
    () =>
      concepts.map((c) => ({
        id: c._id,
        type: "big",
        position: { x: c.x * 1.0, y: c.y * 1.35 },
        data: { ...c, score: understandingScore(c), active: c._id === activeConceptId, selected: c._id === selectedId, onSelect },
      })),
    [concepts, activeConceptId, selectedId, onSelect],
  );
  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => ({
        id: e._id,
        source: e.fromId,
        target: e.toId,
        style: { strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "oklch(0.72 0.06 240)", width: 18, height: 18 },
      })),
    [edges],
  );
  return (
    <div className="min-h-[30rem] flex-1" role="group" aria-label="Concept graph">
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
        fitViewOptions={{ padding: 0.06 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="oklch(0.8 0.03 240)" />
      </ReactFlow>
    </div>
  );
}
