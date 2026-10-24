"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");

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
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-medium">Start a session (instructor)</h2>
        <p className="text-sm text-zinc-600">Upload your lecture notes, review the concepts students will rate, then open the session.</p>
        <Link href="/instructor/new" className="block w-full rounded-lg bg-zinc-900 px-3 py-2 text-center font-medium text-white">
          Set up a lesson
        </Link>
      </section>
    </main>
  );
}
