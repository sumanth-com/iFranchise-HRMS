import { Skeleton } from "@/components/ui/skeleton";

/** Content-area skeleton for team payroll tab switches — keeps sub-nav and header visible. */
export function TeamPayrollContentSkeleton() {
  return (
    <div className="animate-in fade-in duration-150 space-y-4">
      <Skeleton className="h-[min(24rem,55vh)] rounded-xl bg-muted/80 dark:bg-muted/40" />
    </div>
  );
}

/** Full team payroll hub skeleton — sub-nav, header, and content while route/data loads. */
export function TeamPayrollHubSkeleton() {
  return (
    <div className="animate-in fade-in duration-150 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="space-y-3">
        <div className="flex justify-center">
          <Skeleton className="h-10 w-full max-w-3xl rounded-lg bg-muted/80 dark:bg-muted/40" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-8 w-44 bg-muted/80 dark:bg-muted/40" />
          <Skeleton className="h-8 w-28 bg-muted/80 dark:bg-muted/40" />
        </div>
        <Skeleton className="h-4 w-full max-w-xl bg-muted/80 dark:bg-muted/40" />
      </div>
      <TeamPayrollContentSkeleton />
    </div>
  );
}
