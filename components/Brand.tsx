import Link from "next/link";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/** Wordmark used at the top of every screen. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground", className)}>
      <span className="grid size-6 place-items-center border border-primary/60 bg-primary/10 text-primary">
        <Activity className="size-3.5" strokeWidth={2.5} aria-hidden />
      </span>
      <span className="text-muted-foreground" aria-hidden>
        ~/
      </span>
      ClassPulse
      <span className="cursor-blink -ml-1 inline-block h-[1.1em] w-[0.55em] translate-y-px bg-primary" aria-hidden />
    </Link>
  );
}
