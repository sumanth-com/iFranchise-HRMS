import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder for modal body while detail data loads. Dialog chrome stays visible. */
export function DialogBodySkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-5 w-full" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-full" />
        </div>
      ))}
    </div>
  );
}
