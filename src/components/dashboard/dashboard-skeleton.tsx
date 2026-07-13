import { Skeleton } from "@/components/ui/skeleton";

function TileSkeleton() {
  return <Skeleton className="h-[4.5rem] w-full rounded-xl" />;
}

function PanelSkeleton() {
  return <Skeleton className="h-full min-h-[22rem] w-full rounded-xl" />;
}

export function DashboardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 md:p-5">
      <div className="flex shrink-0 flex-col gap-2">
        <Skeleton className="h-[7.25rem] w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
    </div>
  );
}
