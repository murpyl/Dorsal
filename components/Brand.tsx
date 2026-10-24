import Link from "next/link";
import { cn } from "@/lib/utils";

/** Wordmark used at the top of every screen: a tiny Blåhaj (blue back, pale belly, black eye, pink mouth). */
export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 font-heading text-base font-semibold text-foreground", className)}
    >
      <span className="grid size-8 place-items-center rounded-[12px] bg-card text-blahaj shadow-plush ring-1 ring-border/70">
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="none">
          <path d="M5 14 1.2 9.2c2 .9 3.4 2.1 4.6 3.6M5 14l-3.8 4.8c2-.9 3.4-2.1 4.6-3.6" fill="currentColor" fillOpacity="0.95" />
          <path d="M11.2 10.8c.5-3.2 1.9-5.4 4.2-7.1.3 3 .1 5.5-.4 7.3Z" fill="currentColor" fillOpacity="0.95" />
          <path
            d="M2.4 14c3.5-3.3 8-4.6 12.6-3.6 2.8.6 5.3 1.8 7.6 3.6-2.3 1.8-4.8 3-7.6 3.6-4.6 1-9.1-.3-12.6-3.6Z"
            fill="currentColor"
            fillOpacity="0.95"
          />
          <path
            d="M3.2 14.6c3.3 2.6 7.3 3.6 11.5 2.9 2.5-.4 4.8-1.4 6.9-2.9-6 .5-12.2.5-18.4 0Z"
            fill="white"
            fillOpacity="0.95"
          />
          <circle cx="18.4" cy="12.9" r="0.95" fill="oklch(0.2 0.02 250)" />
          <path d="M20.3 15.4c.5-.2.9-.5 1.3-.9" stroke="oklch(0.68 0.12 5)" strokeWidth="0.9" strokeLinecap="round" />
        </svg>
      </span>
      ClassPulse
    </Link>
  );
}
