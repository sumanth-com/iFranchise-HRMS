import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Package,
  PackageOpen,
  Wrench,
} from "lucide-react";

import type { AssetsSummary } from "@/types/assets";

const CARDS = [
  { key: "totalAssets" as const, label: "Total Assets", icon: Boxes, accent: "text-blue-600", bg: "bg-blue-500/10" },
  { key: "assignedAssets" as const, label: "Assigned Assets", icon: Package, accent: "text-violet-600", bg: "bg-violet-500/10" },
  { key: "availableAssets" as const, label: "Available Assets", icon: PackageOpen, accent: "text-emerald-600", bg: "bg-emerald-500/10" },
  { key: "underMaintenance" as const, label: "Under Maintenance", icon: Wrench, accent: "text-amber-600", bg: "bg-amber-500/10" },
  { key: "lostAssets" as const, label: "Lost Assets", icon: AlertTriangle, accent: "text-destructive", bg: "bg-destructive/10" },
  { key: "warrantyExpiring" as const, label: "Warranty Expiring", icon: CheckCircle2, accent: "text-orange-600", bg: "bg-orange-500/10" },
];

export function AssetsSummaryCards({ summary }: { summary: AssetsSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{summary[card.key]}</p>
              </div>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.accent}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AssetsDashboardPanels({ summary }: { summary: AssetsSummary }) {
  const maxCat = Math.max(1, ...summary.assetsByCategory.map((c) => c.count));
  const maxDept = Math.max(1, ...summary.assetsByDepartment.map((d) => d.count));

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Assets by Category</h2>
        <div className="space-y-3">
          {summary.assetsByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assets yet.</p>
          ) : (
            summary.assetsByCategory.map((item) => (
              <div key={item.categoryName}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.categoryName}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${(item.count / maxCat) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Assets by Department</h2>
        <div className="space-y-3">
          {summary.assetsByDepartment.length === 0 ? (
            <p className="text-sm text-muted-foreground">No departmental assets.</p>
          ) : (
            summary.assetsByDepartment.map((item) => (
              <div key={item.departmentName}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.departmentName}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-violet-500/70"
                    style={{ width: `${(item.count / maxDept) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Recent Assignments</h2>
        <div className="space-y-3">
          {summary.recentAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent assignments.</p>
          ) : (
            summary.recentAssignments.map((item) => (
              <div key={item.id} className="border-b pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium">{item.assetName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.employeeName} · {item.assignedDate}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Warranty Expiry Timeline</h2>
        <div className="space-y-3">
          {summary.warrantyTimeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming warranty expiries.</p>
          ) : (
            summary.warrantyTimeline.map((item) => (
              <div key={`${item.assetCode}-${item.warrantyExpiry}`} className="rounded-lg border px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{item.assetCode}</span>
                  <span className="text-xs text-muted-foreground">{item.warrantyExpiry}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.assetName}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
