"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { api } from "@/convex/_generated/api";
import { instructorSecretKey, newSecret } from "@/lib/credentials";
import { errorMessage } from "@/lib/errors";

export default function Home() {
  const router = useRouter();
  const create = useMutation(api.sessions.create);
  const [title, setTitle] = useState("CS 61A: Recursion");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const secret = newSecret();
      const { sessionId } = await create({ title, instructorSecret: secret });
      localStorage.setItem(instructorSecretKey(sessionId), secret);
      router.push(`/instructor/${sessionId}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  function onJoin(e: FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) router.push(`/join/${trimmed}`);
  }

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 p-6 sm:grid-cols-2">
      <h1 className="text-3xl font-semibold sm:col-span-2">ClassPulse</h1>
      <form onSubmit={onJoin} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-medium">Join as a student</h2>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Session code"
          aria-label="Session code"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono uppercase"
        />
        <button className="w-full rounded-lg bg-indigo-600 px-3 py-2 font-medium text-white">Join</button>
      </form>
      <form onSubmit={onCreate} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-medium">Start a session (instructor)</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Session title"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
        <button disabled={busy} className="w-full rounded-lg bg-zinc-900 px-3 py-2 font-medium text-white disabled:opacity-50">
          {busy ? "Creating…" : "Create session"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
