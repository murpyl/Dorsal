"use client";

import { useAction, useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ConceptGraph } from "@/components/ConceptGraph";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  LESSON_FILE_TYPES,
  LESSON_MAX_FILE_BYTES,
  LESSON_MAX_FILES,
  LESSON_MAX_TOTAL_BYTES,
  LESSON_NOTES_MAX,
} from "@/lib/aiSchemas";
import { instructorSecretKey, newSecret, taSecretKey } from "@/lib/credentials";
import { errorMessage } from "@/lib/errors";
import {
  canAddPrerequisite,
  DESCRIPTION_MAX,
  LABEL_MAX,
  layoutConcepts,
  MAX_CONCEPTS,
  removeConcept,
  type LessonConcept,
} from "@/lib/lessonGraph";

type DraftConcept = LessonConcept & { key: string };

const EXTENSION_TYPES: Record<string, string> = { md: "text/markdown", txt: "text/plain", pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

function fileType(file: File) {
  return file.type || EXTENSION_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
}

function fileProblem(files: File[]) {
  if (files.length > LESSON_MAX_FILES) return `Upload at most ${LESSON_MAX_FILES} files.`;
  const bad = files.find((f) => !(LESSON_FILE_TYPES as readonly string[]).includes(fileType(f)));
  if (bad) return `${bad.name}: only PDF, text, Markdown, PNG and JPEG files are supported (export slides to PDF).`;
  const big = files.find((f) => f.size > LESSON_MAX_FILE_BYTES);
  if (big) return `${big.name} is larger than 10 MB.`;
  if (files.reduce((sum, f) => sum + f.size, 0) > LESSON_MAX_TOTAL_BYTES) return "Files must be at most 20 MB in total.";
  return null;
}

function lessonProblem(title: string, concepts: DraftConcept[]) {
  if (!title.trim()) return "Give the session a title.";
  if (concepts.length === 0) return "Add at least one concept.";
  if (concepts.length > MAX_CONCEPTS) return `Keep it to ${MAX_CONCEPTS} concepts or fewer.`;
  if (concepts.some((c) => !c.label.trim())) return "Every concept needs a name.";
  const labels = concepts.map((c) => c.label.trim().toLowerCase());
  if (new Set(labels).size !== labels.length) return "Concept names must be unique.";
  return null;
}

export default function NewSession() {
  const router = useRouter();
  const generateUploadUrl = useMutation(api.lessons.generateUploadUrl);
  const inferConcepts = useAction(api.claude.inferConcepts);
  const create = useMutation(api.sessions.create);

  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [concepts, setConcepts] = useState<DraftConcept[]>([]);
  const [inferring, setInferring] = useState(false);
  const [inferError, setInferError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const filesError = fileProblem(files);
  const lessonError = lessonProblem(title, concepts);
  const hasMaterial = files.length > 0 || notes.trim().length > 0;

  function update(index: number, patch: Partial<DraftConcept>) {
    setConcepts((cs) => cs.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function addConcept() {
    setConcepts((cs) => [...cs, { key: crypto.randomUUID(), label: "", description: "", prerequisites: [] }]);
  }

  async function onSuggest() {
    if (concepts.length > 0 && !window.confirm("Replace the current concept list with new suggestions?")) return;
    setInferring(true);
    setInferError(null);
    try {
      const storageIds = await Promise.all(
        files.map(async (file) => {
          const url = await generateUploadUrl();
          const res = await fetch(url, { method: "POST", headers: { "Content-Type": fileType(file) }, body: file });
          if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
          return ((await res.json()) as { storageId: Id<"_storage"> }).storageId;
        }),
      );
      const result = await inferConcepts({ title, notes: notes.trim() || undefined, storageIds });
      setConcepts(result.concepts.map((c) => ({ ...c, key: crypto.randomUUID() })));
    } catch (err) {
      setInferError(err instanceof Error && !("data" in err) ? err.message : errorMessage(err));
    } finally {
      setInferring(false);
    }
  }

  async function onCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const secret = newSecret();
      const { sessionId } = await create({
        title,
        instructorSecret: secret,
        concepts: concepts.map(({ label, description, prerequisites }) => ({ label, description, prerequisites })),
      });
      localStorage.setItem(instructorSecretKey(sessionId), secret);
      localStorage.removeItem(taSecretKey(sessionId));
      router.push(`/instructor/${sessionId}`);
    } catch (err) {
      setCreateError(errorMessage(err));
      setCreating(false);
    }
  }

  const preview = useMemo(() => {
    const positions = layoutConcepts(concepts);
    return {
      concepts: concepts.map((c, i) => ({
        _id: c.key,
        label: c.label.trim() || "(unnamed)",
        ...positions[i],
        counts: { confused: 0, partial: 0, can_explain: 0 },
        total: 0,
        openClusters: 0,
      })),
      edges: concepts.flatMap((c) => c.prerequisites.map((p) => ({ _id: `${concepts[p].key}-${c.key}`, fromId: concepts[p].key, toId: c.key }))),
    };
  }, [concepts]);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New session</h1>
        <Link href="/" className="text-sm text-indigo-700 underline">
          Back
        </Link>
      </div>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-medium">1. Lesson material</h2>
        <label className="block text-sm">
          <span className="font-medium">Session title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="e.g. CS 61A: Recursion"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Lecture notes and materials</span>
          <span className="block text-xs text-zinc-600">
            PDF, text, Markdown, PNG or JPEG · up to {LESSON_MAX_FILES} files, 10 MB each, 20 MB total. Export slides to PDF.
          </span>
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.md,.png,.jpg,.jpeg,application/pdf,text/plain,text/markdown,image/png,image/jpeg"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="mt-2 block w-full cursor-pointer text-sm text-zinc-600 file:mr-3 file:h-9 file:cursor-pointer file:rounded-full file:border file:border-border file:bg-card file:px-4 file:text-sm file:font-semibold file:text-foreground file:shadow-sm file:transition-colors hover:file:bg-muted"
          />
        </label>
        {files.length > 0 && (
          <ul className="text-xs text-zinc-700">
            {files.map((f) => (
              <li key={f.name}>
                {f.name} · {f.size < 1024 * 1024 ? `${Math.ceil(f.size / 1024)} KB` : `${(f.size / 1024 / 1024).toFixed(1)} MB`}
              </li>
            ))}
          </ul>
        )}
        {filesError && <p className="text-sm text-red-600">{filesError}</p>}
        <label className="block text-sm">
          <span className="font-medium">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={LESSON_NOTES_MAX}
            rows={4}
            placeholder="Paste an outline, learning goals or anything else about this lecture."
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <p className="text-xs text-zinc-600">
          Suggesting concepts sends these files and notes to Anthropic&apos;s Claude API. Uploaded files are deleted right after. Don&apos;t include student
          information.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSuggest}
            disabled={inferring || !hasMaterial || !!filesError}
            className="rounded-lg bg-indigo-600 px-3 py-2 font-medium text-white disabled:opacity-50"
          >
            {inferring ? "Reading material…" : concepts.length > 0 ? "Suggest concepts again" : "Suggest concepts"}
          </button>
          {concepts.length === 0 && (
            <button type="button" onClick={addConcept} className="text-sm text-indigo-700 underline">
              or add concepts by hand
            </button>
          )}
        </div>
        {inferError && (
          <p role="alert" className="text-sm text-red-600">
            {inferError} You can still add concepts by hand below.
          </p>
        )}
      </section>

      {concepts.length > 0 && (
        <section id="per-concept" className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
          <div>
            <h2 className="font-medium">2. Review concepts</h2>
            <p className="text-xs text-zinc-600">
              Students rate their understanding of each concept. Suggestions are a starting point: rename, remove or add concepts and set what each one builds
              on. The first concept starts as the current topic.
            </p>
          </div>
          <ol className="space-y-4">
            {concepts.map((c, i) => {
              const options = concepts.map((o, j) => ({ o, j })).filter(({ j }) => canAddPrerequisite(concepts, i, j));
              return (
                <li key={c.key} className="space-y-3 rounded-lg border border-zinc-200 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-2 w-5 text-sm text-zinc-500">{i + 1}.</span>
                    <div className="flex-1 space-y-2">
                      <input
                        value={c.label}
                        onChange={(e) => update(i, { label: e.target.value })}
                        maxLength={LABEL_MAX}
                        placeholder="Concept name"
                        aria-label={`Concept ${i + 1} name`}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 font-medium"
                      />
                      <input
                        value={c.description}
                        onChange={(e) => update(i, { description: e.target.value })}
                        maxLength={DESCRIPTION_MAX}
                        placeholder="One sentence students will recognise (optional)"
                        aria-label={`Concept ${i + 1} description`}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                      />
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-zinc-600">Builds on:</span>
                        {c.prerequisites.length === 0 && <span className="text-zinc-500">nothing</span>}
                        {c.prerequisites.map((p) => (
                          <span key={concepts[p].key} className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5">
                            {concepts[p].label.trim() || `Concept ${p + 1}`}
                            <button
                              type="button"
                              onClick={() => update(i, { prerequisites: c.prerequisites.filter((q) => q !== p) })}
                              aria-label={`Remove prerequisite ${concepts[p].label || p + 1} from ${c.label || `concept ${i + 1}`}`}
                              className="text-zinc-500 hover:text-red-600"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {options.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => update(i, { prerequisites: [...c.prerequisites, Number(e.target.value)] })}
                            aria-label={`Add prerequisite to ${c.label || `concept ${i + 1}`}`}
                            className="rounded border border-zinc-300 px-1 py-0.5"
                          >
                            <option value="">+ add prerequisite</option>
                            {options.map(({ o, j }) => (
                              <option key={o.key} value={j}>
                                {o.label.trim() || `Concept ${j + 1}`}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConcepts((cs) => removeConcept(cs, i))}
                      aria-label={`Remove ${c.label || `concept ${i + 1}`}`}
                      className="rounded px-2 py-1 text-sm text-zinc-500 hover:bg-red-50 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={addConcept}
            disabled={concepts.length >= MAX_CONCEPTS}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            + Add concept
          </button>
          <ConceptGraph
            concepts={preview.concepts}
            edges={preview.edges}
            activeConceptId={preview.concepts[0]?._id ?? null}
            selectedId={null}
            onSelect={() => {}}
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-4">
            <button
              type="button"
              onClick={onCreate}
              disabled={creating || inferring || !!lessonError}
              className="rounded-lg bg-zinc-900 px-3 py-2 font-medium text-white disabled:opacity-50"
            >
              {creating ? "Creating…" : `Create session (${concepts.length} concept${concepts.length === 1 ? "" : "s"})`}
            </button>
            {lessonError && <p className="text-sm text-zinc-600">{lessonError}</p>}
            {createError && <p className="text-sm text-red-600">{createError}</p>}
          </div>
        </section>
      )}
    </main>
  );
}
