export function ModulePageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-5 animate-pulse">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="h-4 w-72 max-w-full rounded-md bg-muted/80" />
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-xl bg-muted/70" />
        ))}
      </div>
      <div className="min-h-[280px] rounded-xl bg-muted/60" />
    </div>
  );
}
