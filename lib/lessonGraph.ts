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

/** Grid layout: column = longest prerequisite chain leading to the concept, row = order within that column. Assumes no cycles. */
export function layoutConcepts(concepts: { prerequisites: number[] }[]) {
  const depth: number[] = [];
  const depthOf = (i: number): number =>
    (depth[i] ??= Math.max(-1, ...concepts[i].prerequisites.map(depthOf)) + 1);
  const rows = new Map<number, number>();
  return concepts.map((_, i) => {
    const column = depthOf(i);
    const row = rows.get(column) ?? 0;
    rows.set(column, row + 1);
    return { x: column * 260, y: row * 160 };
  });
}

/** Removes concept `index` and re-points the remaining prerequisite indices. */
export function removeConcept<T extends LessonConcept>(concepts: T[], index: number): T[] {
  return concepts
    .filter((_, i) => i !== index)
    .map((c) => ({ ...c, prerequisites: c.prerequisites.filter((p) => p !== index).map((p) => (p > index ? p - 1 : p)) }));
}
