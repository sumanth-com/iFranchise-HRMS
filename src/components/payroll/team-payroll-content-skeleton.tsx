import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const shimmerClass =
  "animate-pulse bg-gradient-to-r from-muted/90 via-muted/50 to-muted/90 bg-[length:200%_100%] dark:from-muted/50 dark:via-muted/25 dark:to-muted/50";

function PayrollSummaryCardsSkeleton() {
  return (
    <div className="grid w-full grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className={cn("h-14 rounded-lg", shimmerClass)} />
      ))}
    </div>
  );
}

function PayrollTableRowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-input bg-white dark:bg-input">
      <div className="border-b border-input/70 px-4 py-3">
        <Skeleton className={cn("h-4 w-full max-w-3xl rounded-md", shimmerClass)} />
      </div>
      <div className="divide-y divide-input/70">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 px-4 py-3"
            style={{ opacity: 1 - index * 0.06 }}
          >
            <Skeleton className={cn("h-9 w-[14rem] shrink-0 rounded-md", shimmerClass)} />
            <Skeleton className={cn("hidden h-4 w-24 rounded-md sm:block", shimmerClass)} />
            <Skeleton className={cn("h-4 w-12 rounded-md", shimmerClass)} />
            <Skeleton className={cn("h-4 w-12 rounded-md", shimmerClass)} />
            <Skeleton className={cn("hidden h-4 w-10 rounded-md md:block", shimmerClass)} />
            <Skeleton className={cn("h-4 w-16 rounded-md", shimmerClass)} />
            <Skeleton className={cn("hidden h-4 w-16 rounded-md lg:block", shimmerClass)} />
            <Skeleton className={cn("h-4 w-16 rounded-md", shimmerClass)} />
            <Skeleton className={cn("ml-auto h-8 w-16 rounded-md", shimmerClass)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Summary cards + table skeleton while payroll data loads (filters/header stay visible). */
export function TeamPayrollDataSkeleton() {
  return (
    <div className="animate-in fade-in duration-150 space-y-4">
      <PayrollSummaryCardsSkeleton />
      <PayrollTableRowsSkeleton />
    </div>
  );
}

/** Content-area skeleton for team payroll tab switches — keeps sub-nav and header visible. */
export function TeamPayrollContentSkeleton() {
  return (
    <div className="animate-in fade-in duration-150 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className={cn("h-9 w-[140px] rounded-md", shimmerClass)} />
        <Skeleton className={cn("h-9 w-[100px] rounded-md", shimmerClass)} />
        <Skeleton className={cn("h-9 min-w-[12rem] flex-1 rounded-md", shimmerClass)} />
      </div>
      <TeamPayrollDataSkeleton />
    </div>
  );
}

/** Full team payroll hub skeleton — sub-nav, header, and content while route/data loads. */
export function TeamPayrollHubSkeleton() {
  return (
    <div className="animate-in fade-in duration-150 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="space-y-3">
        <div className="flex justify-center">
          <Skeleton className={cn("h-10 w-full max-w-3xl rounded-lg", shimmerClass)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className={cn("h-8 w-44", shimmerClass)} />
          <Skeleton className={cn("h-8 w-28", shimmerClass)} />
        </div>
        <Skeleton className={cn("h-4 w-full max-w-xl", shimmerClass)} />
      </div>
      <TeamPayrollContentSkeleton />
    </div>
  );
}
