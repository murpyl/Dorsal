import Link from "next/link";
import { ArrowRight, LayoutPanelLeft, MessageSquare, Smartphone } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const screens = [
  {
    href: "/mock/sidebar-shell/student",
    title: "Student",
    width: "390 px phone",
    icon: Smartphone,
    text: "Sticky current-topic strip, three big confidence buttons, Topics / Ask / Help pager in thumb reach.",
  },
  {
    href: "/mock/sidebar-shell/instructor",
    title: "Instructor",
    width: "1440 px laptop / projector",
    icon: LayoutPanelLeft,
    text: "Left sidebar with join code, phase and section nav; Overview is the live radar, each section is a full page.",
  },
  {
    href: "/mock/sidebar-shell/room",
    title: "Peer room",
    width: "1024 px laptop or phone",
    icon: MessageSquare,
    text: "Chat-first room, members collapsed into an avatar stack, check-in as a slim banner above the composer.",
  },
];

export default function SidebarShellIndex() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6 sm:p-10">
      <header className="space-y-3">
        <Brand />
        <div>
          <p className="text-sm text-muted-foreground">Layout concept · clickable mock with fixture data</p>
          <h1 className="text-3xl font-semibold tracking-tight">Sidebar Shell</h1>
        </div>
        <p className="max-w-prose text-sm text-muted-foreground">
          A conventional app shell that scales as features grow. Nothing here talks to Convex; tabs, drawers, dialogs and the
          confidence buttons work on local state. Rationale in <code className="font-mono text-xs">docs/plans/layout-sidebar-shell.md</code>.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {screens.map((s) => (
          <Link key={s.href} href={s.href} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Card className="h-full transition-colors group-hover:bg-accent/40">
              <CardHeader>
                <s.icon className="size-5 text-blahaj" aria-hidden />
                <CardTitle render={<h2 />}>{s.title}</CardTitle>
                <CardDescription>{s.width}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-3 text-sm text-muted-foreground">
                <p>{s.text}</p>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
