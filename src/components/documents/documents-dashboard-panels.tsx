import {
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  FileText,
} from "lucide-react";

import type { DocumentsSummary } from "@/types/documents";

const CARDS = [
  {
    key: "totalDocuments" as const,
    label: "Total Documents",
    icon: FileText,
    accent: "text-blue-600",
    bg: "bg-blue-500/10",
  },
  {
    key: "pendingVerification" as const,
    label: "Pending Verification",
    icon: AlertTriangle,
    accent: "text-amber-600",
    bg: "bg-amber-500/10",
  },
  {
    key: "expiringSoon" as const,
    label: "Expiring Soon",
    icon: AlertTriangle,
    accent: "text-orange-600",
    bg: "bg-orange-500/10",
  },
  {
    key: "generatedThisMonth" as const,
    label: "Generated This Month",
    icon: FilePlus2,
    accent: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
];

export function DocumentsSummaryCards({ summary }: { summary: DocumentsSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="rounded-2xl border bg-gradient-to-br from-card via-card to-muted/30 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {summary[card.key]}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {card.key === "totalDocuments"
                    ? `${summary.uploadedToday} uploaded today`
                    : card.key === "pendingVerification"
                      ? "Needs HR review"
                      : card.key === "expiringSoon"
                        ? "Renewal attention"
                        : "Letters and templates"}
                </p>
              </div>
              <div className={`rounded-xl p-2.5 ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.accent}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DocumentsDashboardPanels({ summary }: { summary: DocumentsSummary }) {
  const maxType = Math.max(1, ...summary.documentsByType.map((t) => t.count));
  const documentTypes = summary.documentsByType.slice(0, 6);
  const recentActivity = summary.recentActivity.slice(0, 4);
  const recentUploads = summary.recentUploads.slice(0, 4);

  return (
    <div className="grid gap-3 xl:grid-cols-5">
      <section className="rounded-2xl border bg-card p-4 shadow-sm xl:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold">Documents by type</h2>
            <p className="text-xs text-muted-foreground">Most used document folders</p>
          </div>
        </div>
        {summary.documentsByType.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-xl bg-muted/30 text-sm text-muted-foreground">
            No document type data yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {documentTypes.map((item) => (
              <div key={item.typeCode}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{item.typeName.replaceAll("_", " ")}</span>
                  <span className="text-muted-foreground">{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                    style={{ width: `${(item.count / maxType) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm xl:col-span-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <p className="text-xs text-muted-foreground">Latest verification and document events</p>
          </div>
          {summary.recentActivity.length > recentActivity.length ? (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Latest {recentActivity.length}
            </span>
          ) : null}
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {summary.recentActivity.length === 0 ? (
            <div className="rounded-xl bg-muted/30 px-4 py-5 text-sm text-muted-foreground md:col-span-2">
              No recent activity.
            </div>
          ) : (
            recentActivity.map((item) => (
              <div key={item.id} className="rounded-xl border bg-background px-3 py-2">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.action} · {item.employeeName}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm xl:col-span-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Recent uploads</h2>
            <p className="text-xs text-muted-foreground">Newest employee documents added to the system</p>
          </div>
          <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-700">
            {summary.uploadedToday} today
          </span>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {summary.recentUploads.length === 0 ? (
            <div className="rounded-xl bg-muted/30 px-4 py-5 text-sm text-muted-foreground md:col-span-2 xl:col-span-4">
              No uploads yet.
            </div>
          ) : (
            recentUploads.map((item) => (
              <div key={item.id} className="rounded-xl border bg-background px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{item.fileName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.documentTypeName}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{item.employeeName}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
