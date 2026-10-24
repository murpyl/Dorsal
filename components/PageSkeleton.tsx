import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading state; mirrors the page layout so content does not jump in. */
export function PageSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <main className={`mx-auto w-full space-y-4 p-4 [&_[data-slot=skeleton]]:bg-foreground/8 ${wide ? "max-w-none md:px-8" : "max-w-xl"}`} aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-72" />
      </div>
      <div className={`grid gap-4 ${wide ? "grid-cols-2 md:grid-cols-4" : ""}`}>
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        {wide && <Skeleton className="h-24" />}
        {wide && <Skeleton className="h-24" />}
      </div>
      <Skeleton className={wide ? "h-80" : "h-40"} />
    </main>
  );
}
