import Link from "next/link";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/** Wordmark used at the top of every screen. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-md bg-primary py-1 pr-3 pl-1 font-heading text-[13px] font-bold tracking-[0.08em] text-primary-foreground uppercase shadow-[inset_0_-2px_0_var(--california-gold)] outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <span className="grid size-6 place-items-center rounded-[5px] bg-accent text-accent-foreground">
        <Activity className="size-3.5" strokeWidth={2.75} aria-hidden />
      </span>
      ClassPulse
    </Link>
  );
}
