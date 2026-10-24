import Link from "next/link";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/** Wordmark used at the top of every screen. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2 font-heading text-base font-bold tracking-tight text-foreground", className)}>
      <span className="grid size-7 -rotate-6 place-items-center rounded-xl border-2 border-primary-shadow bg-primary text-primary-foreground shadow-[0_2px_0_0_var(--primary-shadow)] transition-transform duration-200 ease-out group-hover:rotate-6 motion-reduce:transition-none">
        <Activity className="size-4" strokeWidth={2.75} aria-hidden />
      </span>
      <span>
        Class<span className="text-primary">Pulse</span>
      </span>
    </Link>
  );
}
