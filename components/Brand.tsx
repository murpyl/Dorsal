import Link from "next/link";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/** Wordmark used at the top of every screen. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground", className)}>
      <span className="grid size-6 place-items-center rounded-md bg-[linear-gradient(135deg,oklch(0.42_0.2_294),oklch(0.6_0.17_300)_55%,oklch(0.7_0.12_190))] text-white shadow-primary ring-1 ring-white/50 ring-inset">
        <Activity className="size-3.5" strokeWidth={2.5} aria-hidden />
      </span>
      ClassPulse
    </Link>
  );
}
