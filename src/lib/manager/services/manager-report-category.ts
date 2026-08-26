import type { ManagerReportCategory } from "@/lib/manager/reports/manager-report-definitions";
import type { ManagerCategoryReportBundle } from "@/types/manager-reports";

/** Pure lookup — safe for client bundles (no query/admin imports). */
export function categoryBundleFor(
  bundles: ManagerCategoryReportBundle[],
  category: ManagerReportCategory,
) {
  return bundles.find((bundle) => bundle.category === category);
}
