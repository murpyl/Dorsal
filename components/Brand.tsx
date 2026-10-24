import Link from "next/link";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

/** Wordmark used at the top of every screen. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-heading text-[15px] font-semibold text-foreground", className)}>
      <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow-moss">
        <Leaf className="size-3.5" strokeWidth={2.25} aria-hidden />
      </span>
      ClassPulse
    </Link>
  );
}
