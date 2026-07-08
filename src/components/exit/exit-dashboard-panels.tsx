import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  LogOut,
  Package,
  Wallet,
} from "lucide-react";

import type { ExitSummary } from "@/types/exit";

const CARDS = [
  {
    key: "pendingResignations" as const,
    label: "Pending Resignations",
    icon: FileWarning,
    accent: "text-amber-600",
    bg: "bg-amber-500/10",
  },
  {
    key: "noticePeriod" as const,
    label: "In Notice Period",
    icon: CalendarClock,
    accent: "text-blue-600",
    bg: "bg-blue-500/10",
  },
  {
    key: "pendingClearance" as const,
    label: "Pending Clearance",
    icon: ClipboardList,
    accent: "text-violet-600",
    bg: "bg-violet-500/10",
  },
  {
    key: "assetsPendingReturn" as const,
    label: "Assets Pending",
    icon: Package,
    accent: "text-orange-600",
    bg: "bg-orange-500/10",
  },
  {
    key: "settlementsPending" as const,
    label: "Settlements Pending",
    icon: Wallet,
    accent: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
  {
    key: "leavingThisMonth" as const,
    label: "Leaving This Month",
    icon: LogOut,
    accent: "text-destructive",
    bg: "bg-destructive/10",
  },
];

export function ExitSummaryCards({ summary }: { summary: ExitSummary }) {
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
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {summary[card.key]}
                </p>
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

export function ExitDashboardPanels({ summary }: { summary: ExitSummary }) {
  const maxDept = Math.max(1, ...summary.exitByDepartment.map((d) => d.count));
  const maxMonth = Math.max(1, ...summary.monthlyAttrition.map((m) => m.count));
  const maxReason = Math.max(1, ...summary.exitReasons.map((r) => r.count));

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Exits by Department</h2>
        <div className="space-y-3">
          {summary.exitByDepartment.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exit data yet.</p>
          ) : (
            summary.exitByDepartment.map((item) => (
              <div key={item.departmentName}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.departmentName}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${(item.count / maxDept) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Monthly Attrition</h2>
        <div className="space-y-3">
          {summary.monthlyAttrition.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attrition history.</p>
          ) : (
            summary.monthlyAttrition.map((item) => (
              <div key={item.month}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.month}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-violet-500/70"
                    style={{ width: `${(item.count / maxMonth) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Exit Reasons</h2>
        <div className="space-y-3">
          {summary.exitReasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reasons recorded.</p>
          ) : (
            summary.exitReasons.map((item) => (
              <div key={item.reason}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="truncate text-muted-foreground">{item.reason}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-500/70"
                    style={{ width: `${(item.count / maxReason) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Recent Activity</h2>
        <div className="space-y-3">
          {summary.recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            summary.recentActivities.map((item) => (
              <div key={item.id} className="border-b pb-3 last:border-0 last:pb-0">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.description ? (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
