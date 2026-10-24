"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ArrowRight, GraduationCap, Presentation } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
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
            <CardTitle render={<h2 />}>Join as a student</CardTitle>
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
            <CardTitle render={<h2 />}>Start a session</CardTitle>
            <CardDescription>
              For instructors. Upload your lecture notes, review the concepts students will rate, then open the session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" variant="outline" className="w-full" nativeButton={false} render={<Link href="/instructor/new" />}>
              Set up a lesson
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
