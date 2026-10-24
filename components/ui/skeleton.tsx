import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("hatch animate-pulse rounded-none border-2 border-foreground/40 bg-background", className)}
      {...props}
    />
  )
}

export { Skeleton }
