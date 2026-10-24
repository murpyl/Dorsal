import Link from "next/link";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/** Wordmark used at the top of every screen. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-heading text-sm tracking-tight text-foreground uppercase", className)}>
      <span className="grid size-6 place-items-center border-2 border-foreground bg-foreground text-primary shadow-[2px_2px_0_0_var(--primary)]">
        <Activity className="size-3.5" strokeWidth={3} aria-hidden />
      </span>
      ClassPulse
    </Link>
  );
}
