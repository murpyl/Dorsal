import dagre from "@dagrejs/dagre";

export const MAX_CONCEPTS = 12;
export const LABEL_MAX = 60;
export const DESCRIPTION_MAX = 200;

/** A draft lesson concept; `prerequisites` are indices of other concepts in the same list. */
export type LessonConcept = { label: string; description: string; prerequisites: number[] };

/** True if `from` can already reach `to` through prerequisite links (so adding to → from would close a cycle). */
export function reaches(concepts: { prerequisites: number[] }[], from: number, to: number) {
  const dependents = concepts.map(() => [] as number[]);
  concepts.forEach((c, i) => c.prerequisites.forEach((p) => dependents[p]?.push(i)));
  const seen = new Set<number>();
  const stack = [from];
  while (stack.length) {
    const i = stack.pop()!;
    if (i === to) return true;
    if (seen.has(i)) continue;
    seen.add(i);
    stack.push(...dependents[i]);
  }
  return false;
}

/** Whether `prereq` can be added as a prerequisite of `concept` without a self-link, duplicate or cycle. */
export function canAddPrerequisite(concepts: { prerequisites: number[] }[], concept: number, prereq: number) {
  return concept !== prereq && !concepts[concept].prerequisites.includes(prereq) && !reaches(concepts, concept, prereq);
}

const NODE = { width: 192, height: 96 };

/** Left-to-right prerequisite layout via dagre; returns each concept's top-left React Flow position. */
export function layoutConcepts(concepts: { prerequisites: number[] }[]) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 64, ranksep: 68 });
  g.setDefaultEdgeLabel(() => ({}));
  concepts.forEach((_, i) => g.setNode(String(i), { ...NODE }));
  concepts.forEach((c, i) => c.prerequisites.forEach((p) => g.setEdge(String(p), String(i))));
  dagre.layout(g);
  return concepts.map((_, i) => {
    const { x, y } = g.node(String(i));
    return { x: Math.round(x - NODE.width / 2), y: Math.round(y - NODE.height / 2) };
  });
}

/** Removes concept `index` and re-points the remaining prerequisite indices. */
export function removeConcept<T extends LessonConcept>(concepts: T[], index: number): T[] {
  return concepts
    .filter((_, i) => i !== index)
    .map((c) => ({ ...c, prerequisites: c.prerequisites.filter((p) => p !== index).map((p) => (p > index ? p - 1 : p)) }));
}
