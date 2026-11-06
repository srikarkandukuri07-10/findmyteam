import { Skeleton } from "@/components/skeleton";

/** The inbox while conversations load. */
export function InboxSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
