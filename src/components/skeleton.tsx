import type { ComponentProps } from "react";

/** A grey placeholder block with a soft light sweeping across it while content loads. */
export function Skeleton({ className = "", ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={`shimmer rounded-xl ${className}`} {...props} />;
}

/** One card-shaped placeholder. */
export function CardSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={`rounded-3xl bg-surface p-6 shadow-card ${className}`}>
      <Skeleton className="h-5 w-2/5" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? "w-3/5" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

/** A grid of card placeholders, for lists of hackathons, teams and the like. */
export function GridSkeleton({ count = 4, columns = "md:grid-cols-2" }: { count?: number; columns?: string }) {
  return (
    <div className={`grid gap-4 ${columns}`}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} lines={3} />
      ))}
    </div>
  );
}

/** Placeholder shaped like the swipe card. */
export function DeckSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto w-full max-w-md">
      <div className="rounded-3xl bg-surface p-6 shadow-card">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </div>
        <Skeleton className="mt-6 h-12 w-full" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
        <div className="mt-6 flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Dashboard-shaped placeholder for the home page. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 md:grid-cols-3">
      <CardSkeleton lines={3} />
      <CardSkeleton lines={1} />
      <CardSkeleton lines={1} />
      <CardSkeleton lines={4} className="md:col-span-2" />
      <CardSkeleton lines={5} />
    </div>
  );
}
