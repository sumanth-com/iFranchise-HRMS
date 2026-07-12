import { PageScroll } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";

function TileSkeleton() {
  return <Skeleton className="h-[62px] w-full rounded-lg" />;
}

function PanelSkeleton({ className }: { className?: string }) {
  return <Skeleton className={`h-40 w-full rounded-xl ${className ?? ""}`} />;
}

export function DashboardSkeleton() {
  return (
    <PageScroll className="gap-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        {Array.from({ length: 9 }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-2 lg:grid-cols-[1.4fr_1fr]">
        <PanelSkeleton className="h-56" />
        <PanelSkeleton className="h-56" />
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <PanelSkeleton key={i} />
        ))}
      </div>
    </PageScroll>
  );
}
