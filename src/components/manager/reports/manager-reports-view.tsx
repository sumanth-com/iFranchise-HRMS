"use client";

import { useCallback, useState, useTransition } from "react";

import { Button } from "@/components/common/button";
import { ManagerReportsCategoryPanel } from "@/components/manager/reports/manager-reports-category-panel";
import { ManagerReportsCharts } from "@/components/manager/reports/manager-reports-charts";
import { ManagerReportsFilters } from "@/components/manager/reports/manager-reports-filters";
import { ManagerReportsKpis } from "@/components/manager/reports/manager-reports-kpis";
import { MANAGER_REPORT_CATEGORIES } from "@/lib/manager/reports/manager-report-definitions";
import type { ManagerReportCategory } from "@/lib/manager/reports/manager-report-definitions";
import { categoryBundleFor } from "@/lib/manager/services/team-reports-queries";
import { refreshManagerReportsAction } from "@/lib/manager/actions/manager-reports-actions";
import { hasAnyPermission } from "@/lib/permissions/utils";
import type { ManagerReportsListParams, ManagerReportsPageData } from "@/types/manager-reports";

type ManagerReportsViewProps = ManagerReportsPageData & {
  initialFilters: ManagerReportsListParams;
  permissionCodes: string[];
};

export function ManagerReportsView({
  summary: initialSummary,
  trends: initialTrends,
  categoryBundles: initialCategoryBundles,
  lookups,
  initialFilters,
  permissionCodes,
}: ManagerReportsViewProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [trends, setTrends] = useState(initialTrends);
  const [categoryBundles, setCategoryBundles] = useState(initialCategoryBundles);
  const [filters, setFilters] = useState<ManagerReportsListParams>(initialFilters);
  const [activeCategory, setActiveCategory] = useState<ManagerReportCategory>(
    initialFilters.category ?? "attendance",
  );
  const [isPending, startTransition] = useTransition();

  const canExport = hasAnyPermission(permissionCodes, ["reports.export"]);

  const refreshData = useCallback((nextFilters: ManagerReportsListParams) => {
    startTransition(async () => {
      const data = await refreshManagerReportsAction(nextFilters);
      setSummary(data.summary);
      setTrends(data.trends);
      setCategoryBundles(data.categoryBundles);
    });
  }, []);

  function updateFilters(next: Partial<ManagerReportsListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    refreshData(merged);
  }

  function selectCategory(category: ManagerReportCategory) {
    setActiveCategory(category);
    updateFilters({ category });
  }

  const activeBundle = categoryBundleFor(categoryBundles, activeCategory);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Team-scoped reports for your reporting hierarchy only. Company-wide data is never shown.
        </p>
      </div>

      <ManagerReportsKpis summary={summary} />
      <ManagerReportsFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        disabled={isPending}
      />
      <ManagerReportsCharts trends={trends} />

      <div className="flex flex-wrap gap-2">
        {MANAGER_REPORT_CATEGORIES.map((category) => (
          <Button
            key={category.id}
            size="sm"
            variant={activeCategory === category.id ? "default" : "outline"}
            onClick={() => selectCategory(category.id)}
          >
            {category.label}
          </Button>
        ))}
      </div>

      <ManagerReportsCategoryPanel
        category={activeCategory}
        bundle={activeBundle}
        filters={filters}
        canExport={canExport}
      />
    </div>
  );
}
