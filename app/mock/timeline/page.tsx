import Link from "next/link";
import { ArrowRight, Monitor, Smartphone, Tablet } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const screens = [
  {
    href: "/mock/timeline/student",
    title: "Student",
    width: "390px · phone, one hand",
    icon: Smartphone,
    blurb: "A chat-like lecture feed: the current topic is pinned on top, everything that happened earlier scrolls below it, and the composer always asks about the pinned topic.",
  },
  {
    href: "/mock/timeline/instructor",
    title: "Instructor",
    width: "1440px · laptop or projector",
    icon: Monitor,
    blurb: "A slim graph overview, then the question lifecycle as four columns: Pending → Suggested → Published → Rooms. Buttons move cards to the right; nothing is dragged.",
  },
  {
    href: "/mock/timeline/room",
    title: "Peer room",
    width: "1024px · laptop, also works on phone",
    icon: Tablet,
    blurb: "Context and members on the left, the room's own chat timeline on the right. The after-help check-in arrives inside the chat as an event.",
  },
];

export default function TimelineIndex() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10">
      <header className="space-y-3">
        <Brand />
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Layout concept: Timeline</h1>
          <Badge variant="secondary">mockup · fixture data · nothing is saved</Badge>
        </div>
        <p className="max-w-2xl text-muted-foreground">
          A lecture is linear in time, so the student screen reads like a conversation with the lecture, the instructor screen is the question
          pipeline laid out left to right, and the peer room is a smaller timeline of its own. Everything is clickable with local state; see{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">docs/plans/layout-timeline.md</code> for the rationale.
        </p>
      </header>
      <ul className="grid gap-4 md:grid-cols-3">
        {screens.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="group block h-full rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Card className="h-full transition-colors group-hover:border-primary">
                <CardHeader>
                  <s.icon className="size-6 text-primary" aria-hidden />
                  <CardTitle className="flex items-center justify-between">
                    {s.title}
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </CardTitle>
                  <CardDescription>{s.width}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{s.blurb}</CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        Fixture: CS 61A Lecture 8 (Recursion), 36 students, 6 concepts, 10 questions, 2 suggested and 2 published clusters, 2 rooms. Student
        screens never show aggregate counts; the instructor screen does.
      </p>
    </main>
  );
}
