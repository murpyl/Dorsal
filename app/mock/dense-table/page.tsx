import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SCREENS = [
  { href: "/mock/dense-table/student", title: "Student", width: "390 px", blurb: "Compact concept list with an inline segmented control per row; ask / clusters / rooms / help as accordions." },
  { href: "/mock/dense-table/instructor", title: "Instructor", width: "1440 px", blurb: "One row per concept, clusters and rooms as tables, keyboard-first with visible shortcuts, graph on a toggle." },
  { href: "/mock/dense-table/room", title: "Peer room", width: "1024 px", blurb: "Chat first, check-in and members in a rail; system lines announce joins and phase changes." },
];

export default function DenseTableIndex() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <header className="space-y-2">
        <Brand />
        <h1 className="text-2xl font-semibold tracking-tight">Layout concept: Dense Table</h1>
        <p className="text-muted-foreground">
          Clickable mockup on fixture data (CS 61A recursion lecture). Rationale in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">docs/plans/layout-dense-table.md</code>.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {SCREENS.map((s) => (
          <Link key={s.href} href={s.href} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Card className="h-full transition-colors group-hover:bg-accent/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {s.title}
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </CardTitle>
                <CardDescription>designed at {s.width}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{s.blurb}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
