"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ArrowRight, GraduationCap, Presentation } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Brand } from "@/components/Brand";
import { InlineError } from "@/components/InlineError";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-12 sm:px-6">
      <header className="enter space-y-4 text-center">
        <Brand className="justify-center" />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">See where the class is stuck, live.</h1>
          <p className="mx-auto max-w-md text-pretty text-muted-foreground">
            Students report how well they follow each concept and ask questions anonymously. Instructors get a live map of
            confusion and open small peer-help rooms.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="enter" style={{ "--i": 1 } as React.CSSProperties}>
          <CardHeader>
            <span className="mb-1 grid size-9 place-items-center rounded-lg bg-muted text-foreground">
              <GraduationCap className="size-4.5" aria-hidden />
            </span>
            <CardTitle>Join as a student</CardTitle>
            <CardDescription>Enter the six-letter code shown on the lecture screen.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onJoin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="session-code">Session code</Label>
                <Input
                  id="session-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="ABCDEF"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Session code"
                  className="h-11 font-mono text-lg tracking-[0.3em] uppercase placeholder:tracking-[0.3em]"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={!code.trim()}>
                Join session
                <ArrowRight data-icon="inline-end" aria-hidden />
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="enter" style={{ "--i": 2 } as React.CSSProperties}>
          <CardHeader>
            <span className="mb-1 grid size-9 place-items-center rounded-lg bg-muted text-foreground">
              <Presentation className="size-4.5" aria-hidden />
            </span>
            <CardTitle>Start a session</CardTitle>
            <CardDescription>For instructors. You get a code to share and a live dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="session-title">Session title</Label>
                <Input
                  id="session-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-label="Session title"
                  className="h-11"
                />
              </div>
              <Button type="submit" size="lg" variant="outline" className="w-full" disabled={busy || !title.trim()}>
                {busy ? "Creating…" : "Create session"}
              </Button>
              <InlineError message={error} />
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
