import type { CeoApprovalsCategoryCount } from "@/types/ceo-approvals";

export function CeoApprovalsCategories({
  categories,
  activeType,
  onSelect,
}: {
  categories: CeoApprovalsCategoryCount[];
  activeType?: string;
  onSelect: (type: CeoApprovalsCategoryCount["type"] | undefined) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Approval Categories</h2>
        <p className="text-xs text-muted-foreground">
          Executive-level approvals only. Routine employee requests are excluded.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const active = activeType === category.type;
          return (
            <button
              key={category.type}
              type="button"
              onClick={() => onSelect(active ? undefined : category.type)}
              className={`rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/30 ${
                active ? "border-primary ring-1 ring-primary/30" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{category.label}</p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                  {category.pending} pending
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {category.total} total in queue history
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
