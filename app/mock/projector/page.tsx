import Link from "next/link";
import { ArrowRight, Monitor, Presentation, Smartphone } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SCREENS = [
  { href: "/mock/projector/student", title: "Student", hint: "Phone · 390px", icon: Smartphone, text: "Bottom tab bar (Topics · Ask · Help) with the current topic pinned under the header." },
  { href: "/mock/projector/instructor", title: "Instructor", hint: "Laptop / projector · 1440px", icon: Presentation, text: "Join code and QR in the top bar, oversized concept graph as the hero, raw questions in a closed-by-default drawer." },
  { href: "/mock/projector/room", title: "Peer room", hint: "Phone or laptop · 1024px", icon: Monitor, text: "Chat as the hero with the check-in prompt docked above it; members in a side rail." },
];

export default function ProjectorIndex() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-12">
      <header className="space-y-3">
        <Brand />
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Layout mockup: Projector Mode</h1>
        <p className="text-muted-foreground">
          Clickable, fixture-driven screens for one CS 61A recursion lecture. Nothing here talks to Convex. Rationale in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">docs/plans/layout-projector.md</code>.
        </p>
      </header>
      <ul className="grid gap-4">
        {SCREENS.map(({ href, title, hint, icon: Icon, text }) => (
          <li key={href}>
            <Link href={href} className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Card className="transition-colors group-hover:bg-accent/60">
                <CardHeader className="grid-cols-[auto_1fr_auto] items-center gap-4">
                  <span className="grid size-10 place-items-center rounded-lg bg-muted">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <CardTitle render={<h2 />}>
                      {title} <span className="ml-1 text-sm font-normal text-muted-foreground">{hint}</span>
                    </CardTitle>
                    <CardDescription>{text}</CardDescription>
                  </div>
                  <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </CardHeader>
                <CardContent className="sr-only">Open the {title} mockup</CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
