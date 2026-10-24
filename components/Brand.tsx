import Link from "next/link";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/** Wordmark used at the top of every screen. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("font-heading inline-flex items-center gap-2 text-xl text-foreground", className)}>
      <span className="grid size-6 -rotate-6 place-items-center rounded-md bg-primary text-primary-foreground shadow-[0_1px_2px_oklch(0_0_0/45%)]">
        <Activity className="size-3.5" strokeWidth={2.5} aria-hidden />
      </span>
      ClassPulse
    </Link>
  );
}
