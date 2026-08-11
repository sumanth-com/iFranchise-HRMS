import { Skeleton } from "@/components/ui/skeleton";

/** Content-area skeleton for team payroll tab switches — keeps sub-nav and header visible. */
export function TeamPayrollContentSkeleton() {
  return (
    <div className="animate-in fade-in duration-150 space-y-4">
      <Skeleton className="h-[min(24rem,55vh)] rounded-xl" />
    </div>
  );
}
