import { Skeleton } from "@/components/ui/skeleton";

/**
 * Content-area placeholder for module tab/page switches.
 * Intended to render inside an existing ModuleShell so sub-nav stays visible.
 */
export function ModuleSectionSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-36 sm:ml-auto" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border/70">
        <Skeleton className="h-11 w-full rounded-none" />
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="border-t border-border/50 px-4 py-3"
          >
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
