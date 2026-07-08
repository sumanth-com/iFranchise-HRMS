import {
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  FileText,
  Upload,
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
  {
    key: "uploadedToday" as const,
    label: "Uploaded Today",
    icon: Upload,
    accent: "text-violet-600",
    bg: "bg-violet-500/10",
  },
];

export function DocumentsSummaryCards({ summary }: { summary: DocumentsSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

export function DocumentsDashboardPanels({ summary }: { summary: DocumentsSummary }) {
  const maxType = Math.max(1, ...summary.documentsByType.map((t) => t.count));

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Documents by Type</h2>
        </div>
        <div className="space-y-3">
          {summary.documentsByType.map((item) => (
            <div key={item.typeCode}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.typeName.replaceAll("_", " ")}
                </span>
                <span className="font-medium">{item.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${(item.count / maxType) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Recent Activity</h2>
        <div className="space-y-3">
          {summary.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            summary.recentActivity.map((item) => (
              <div key={item.id} className="border-b pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.action} · {item.employeeName} · {item.documentTypeName}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium">Recent Uploads</h2>
        <div className="space-y-3">
          {summary.recentUploads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No uploads yet.</p>
          ) : (
            summary.recentUploads.map((item) => (
              <div key={item.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.fileName}</span>
                  <span className="text-xs text-muted-foreground">{item.documentTypeName}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.employeeName}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
