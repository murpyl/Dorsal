import Link from "next/link";
import { ArrowRight, Presentation, Smartphone, Users } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const screens = [
  {
    href: "/mock/focus-flow/student",
    title: "Student",
    icon: Smartphone,
    hint: "Phone, 390px. One concept at a time, three thumb-sized answers pinned at the bottom.",
  },
  {
    href: "/mock/focus-flow/instructor",
    title: "Instructor",
    icon: Presentation,
    hint: "Laptop / projector, 1440px. Graph on the left, live feed on the right, nothing scrolls.",
  },
  {
    href: "/mock/focus-flow/room",
    title: "Peer room",
    icon: Users,
    hint: "Phone or laptop, 1024px. Chat first, members and check-in beside it.",
  },
];

export default function FocusFlowIndex() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-12">
      <header className="space-y-3">
        <Brand />
        <h1 className="text-3xl font-semibold tracking-tight">Layout mockup: Focus Flow</h1>
        <p className="max-w-xl text-pretty text-muted-foreground">
          Clickable layout concept with fixture data from one CS 61A recursion lecture. Nothing here talks to Convex; local state only.
          Rationale in <code className="font-mono text-sm">docs/plans/layout-focus-flow.md</code>.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {screens.map((s) => (
          <Link key={s.href} href={s.href} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Card className="h-full transition-colors group-hover:bg-accent/60">
              <CardHeader>
                <span className="mb-1 grid size-9 place-items-center rounded-lg bg-muted text-foreground">
                  <s.icon className="size-4.5" aria-hidden />
                </span>
                <CardTitle render={<h2 />} className="flex items-center gap-1">
                  {s.title}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </CardTitle>
                <CardDescription>{s.hint}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
