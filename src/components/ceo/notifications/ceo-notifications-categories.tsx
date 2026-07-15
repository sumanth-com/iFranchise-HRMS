"use client";

import type { CeoNotificationCategoryCount, CeoNotificationCategory } from "@/types/ceo-notifications";

export function CeoNotificationsCategories({
  categories,
  activeCategory,
  onSelect,
}: {
  categories: CeoNotificationCategoryCount[];
  activeCategory?: CeoNotificationCategory;
  onSelect: (category: CeoNotificationCategory | undefined) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Notification Categories</h2>
        <p className="text-xs text-muted-foreground">
          Executive alerts grouped by business domain.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {categories.map((item) => {
          const active = activeCategory === item.category;
          return (
            <button
              key={item.category}
              type="button"
              onClick={() => onSelect(active ? undefined : item.category)}
              className={`rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/30 ${
                active ? "border-primary ring-1 ring-primary/30" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{item.label}</p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                  {item.count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
