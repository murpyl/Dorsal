import Link from "next/link";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/** Wordmark used at the top of every screen. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 font-heading text-base font-semibold tracking-tight text-foreground", className)}
    >
      <span className="grid size-6 place-items-center rounded-sm bg-primary text-primary-foreground">
        <Activity className="size-3.5" strokeWidth={2.5} aria-hidden />
      </span>
      <span>
        Class<span className="italic text-accent">Pulse</span>
      </span>
    </Link>
  );
}
