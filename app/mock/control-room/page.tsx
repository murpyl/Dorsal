import Link from "next/link";
import { ArrowRight, Monitor, MessagesSquare, Smartphone } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SCREENS = [
  {
    href: "/mock/control-room/student",
    title: "Student",
    width: "390 px · phone, one hand",
    text: "Sticky header with code + current topic + your answer; sticky bottom confidence bar so the current topic is always one tap away.",
    icon: Smartphone,
  },
  {
    href: "/mock/control-room/instructor",
    title: "Instructor",
    width: "1440 px · laptop / projector",
    text: "Three persistent panes — concept rail, graph, inspector — with the moderation queue as a bottom drawer over the graph and inspector.",
    icon: Monitor,
  },
  {
    href: "/mock/control-room/room",
    title: "Peer room",
    width: "1024 px · phone or laptop",
    text: "Members rail, chat in the centre, and a persistent check-in strip above the composer that records the post-help signal.",
    icon: MessagesSquare,
  },
];

export default function ControlRoomIndex() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <header className="space-y-3">
        <Brand />
        <div className="space-y-1">
          <p className="text-sm font-medium text-primary">Layout concept · mockup with fixture data</p>
          <h1 className="text-3xl font-semibold tracking-tight">Control Room</h1>
          <p className="max-w-xl text-pretty text-muted-foreground">
            Everything the instructor needs stays on screen at once, like a mixing desk; the student gets one always-reachable control
            for the topic being taught right now. Clickable with local state only — nothing here talks to Convex.
          </p>
        </div>
      </header>
      <ul className="grid gap-4">
        {SCREENS.map((s, i) => (
          <li key={s.href} className="enter" style={{ "--i": i } as React.CSSProperties}>
            <Link href={s.href} className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Card className="transition-colors group-hover:bg-card/70">
                <CardHeader className="grid-cols-[auto_1fr_auto] items-center gap-4">
                  <span className="grid size-10 place-items-center rounded-lg bg-muted text-foreground">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <div className="space-y-1">
                    <CardTitle render={<h2 />}>
                      {s.title} <span className="ml-2 text-xs font-normal text-muted-foreground">{s.width}</span>
                    </CardTitle>
                    <CardDescription>{s.text}</CardDescription>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </CardHeader>
                <CardContent className="sr-only">Open the {s.title} mockup</CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        Rationale and trade-offs: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">docs/plans/layout-control-room.md</code>
      </p>
    </main>
  );
}
