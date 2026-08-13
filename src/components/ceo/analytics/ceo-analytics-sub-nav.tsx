"use client";

import {
  CEO_ANALYTICS_SECTIONS,
  type CeoAnalyticsSectionId,
} from "@/lib/ceo/constants";
import { cn } from "@/lib/utils";

type CeoAnalyticsSubNavProps = {
  value: CeoAnalyticsSectionId;
  onChange: (section: CeoAnalyticsSectionId) => void;
};

export function CeoAnalyticsSubNav({ value, onChange }: CeoAnalyticsSubNavProps) {
  return (
    <div className="flex justify-center">
      <nav
        className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
        aria-label="Analytics sections"
      >
        {CEO_ANALYTICS_SECTIONS.map((item) => {
          const isActive = value === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.title}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
