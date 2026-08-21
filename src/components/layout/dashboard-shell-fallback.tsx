import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Chrome that paints immediately while session + profile resolve.
 * Matches sidebar + top nav so the first paint is never a blank page.
 */
export function DashboardShellFallback() {
  return (
    <div className="app-shell-canvas flex h-screen overflow-hidden bg-background" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading workspace</span>
      <aside className="app-shell-sidebar hidden h-full w-64 shrink-0 flex-col border-r bg-transparent md:flex">
        <div className="flex h-14 items-center gap-3 border-b px-4">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="app-shell-topnav flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
          <Skeleton className="h-4 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </header>
        <main className="app-shell-main relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <DashboardSkeleton />
        </main>
      </div>
    </div>
  );
}
