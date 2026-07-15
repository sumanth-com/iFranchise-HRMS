import {
  CEO_REPORT_CATEGORIES,
  CEO_REPORT_CATEGORY_LABELS,
} from "@/lib/ceo/ceo-report-definitions";
import type { CeoReportCatalogItem, CeoReportCategory } from "@/types/ceo-reports";

export function CeoReportsCategories({
  catalog,
  activeCategory,
  onSelect,
}: {
  catalog: CeoReportCatalogItem[];
  activeCategory?: CeoReportCategory;
  onSelect: (category: CeoReportCategory | undefined) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Report Categories</h2>
        <p className="text-xs text-muted-foreground">
          Executive business reports for leadership and board meetings.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {CEO_REPORT_CATEGORIES.map((category) => {
          const count = catalog.filter((item) => item.category === category).length;
          const active = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelect(active ? undefined : category)}
              className={`rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/30 ${
                active ? "border-primary ring-1 ring-primary/30" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">
                  {CEO_REPORT_CATEGORY_LABELS[category]}
                </p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                  {count} types
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
