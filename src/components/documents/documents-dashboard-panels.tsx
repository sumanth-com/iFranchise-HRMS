import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  FilePlus2,
  FileText,
  FolderOpen,
  Mail,
  Settings2,
  Users,
} from "lucide-react";

import { Button } from "@/components/common/button";
import {
  TABLE_HEADER_CELL_CLASS,
  TABLE_HEADER_ROW_CLASS,
  TABLE_HEADER_STICKY_CLASS,
} from "@/components/common/table-header-classes";
import {
  DOCUMENTS_ROUTES,
  documentsHubUrl,
  TEAM_DOCUMENTS_SECTIONS,
} from "@/lib/documents/constants";
import { cn } from "@/lib/utils";
import type { DocumentsSummary, EmployeeDocumentItem } from "@/types/documents";

const SUMMARY_CARDS = [
  {
    key: "totalDocuments" as const,
    label: "Total Documents",
    icon: FileText,
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    href: DOCUMENTS_ROUTES.employeeDocuments,
    hint: (summary: DocumentsSummary) => `${summary.uploadedToday} uploaded today`,
  },
  {
    key: "pendingVerification" as const,
    label: "Pending Review",
    icon: AlertTriangle,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    href: documentsHubUrl({
      section: TEAM_DOCUMENTS_SECTIONS.employees,
      params: { documentStatus: "pending" },
    }),
    hint: () => "Awaiting HR verification",
  },
  {
    key: "expiringSoon" as const,
    label: "Expiring Soon",
    icon: CalendarClock,
    accent: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    href: DOCUMENTS_ROUTES.expiring,
    hint: () => "Renewal attention needed",
  },
  {
    key: "generatedThisMonth" as const,
    label: "Generated This Month",
    icon: FilePlus2,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    href: DOCUMENTS_ROUTES.letters,
    hint: () => "Letters and templates",
  },
];

const QUICK_LINKS = [
  {
    title: "Employee folders",
    description: "Upload and verify per employee",
    icon: Users,
    href: DOCUMENTS_ROUTES.employeeDocuments,
  },
  {
    title: "Company letters",
    description: "Generate and publish letters",
    icon: Mail,
    href: DOCUMENTS_ROUTES.letters,
  },
  {
    title: "Expiring documents",
    description: "Renewals and expired files",
    icon: CalendarClock,
    href: DOCUMENTS_ROUTES.expiring,
  },
  {
    title: "Settings",
    description: "Upload rules and categories",
    icon: Settings2,
    href: DOCUMENTS_ROUTES.settings,
  },
];

export function DocumentsSummaryCards({ summary }: { summary: DocumentsSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {SUMMARY_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {summary[card.key]}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {card.hint(summary)}
                </p>
              </div>
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  card.bg,
                )}
              >
                <Icon className={cn("size-4", card.accent)} />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function DocumentStatusBadge({ status }: { status: EmployeeDocumentItem["documentStatus"] }) {
  const classes: Record<EmployeeDocumentItem["documentStatus"], string> = {
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    rejected: "bg-destructive/10 text-destructive",
    expired: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  };

  const labels: Record<EmployeeDocumentItem["documentStatus"], string> = {
    pending: "Pending",
    verified: "Verified",
    rejected: "Rejected",
    expired: "Expired",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        classes[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

export function DocumentsDashboardPanels({
  summary,
  pendingQueue = [],
  pendingTotal = 0,
}: {
  summary: DocumentsSummary;
  pendingQueue?: EmployeeDocumentItem[];
  pendingTotal?: number;
}) {
  const maxType = Math.max(1, ...summary.documentsByType.map((t) => t.count));
  const documentTypes = summary.documentsByType.slice(0, 6);
  const recentActivity = summary.recentActivity.slice(0, 4);
  const recentUploads = summary.recentUploads.slice(0, 6);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </section>

      {pendingQueue.length > 0 ? (
        <section className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Pending verification</h2>
              <p className="text-xs text-muted-foreground">
                Documents waiting for HR review
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link
                  href={documentsHubUrl({
                    section: TEAM_DOCUMENTS_SECTIONS.employees,
                    params: { documentStatus: "pending" },
                  })}
                />
              }
            >
              View all ({pendingTotal})
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={TABLE_HEADER_STICKY_CLASS}>
                <tr className={TABLE_HEADER_ROW_CLASS}>
                  <th className={TABLE_HEADER_CELL_CLASS}>Employee</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>Document</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>Type</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>Uploaded</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>Status</th>
                  <th className={cn(TABLE_HEADER_CELL_CLASS, "text-right")}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingQueue.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{item.employeeName}</td>
                    <td className="max-w-[12rem] truncate px-4 py-3">{item.fileName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.documentTypeName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(parseISO(item.createdAt), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge status={item.documentStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={
                          <Link href={DOCUMENTS_ROUTES.employeeDocument(item.employeeId)} />
                        }
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        <section className="rounded-xl border bg-card p-4 shadow-sm xl:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <FolderOpen className="size-4 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold">Documents by type</h2>
              <p className="text-xs text-muted-foreground">Most common document categories</p>
            </div>
          </div>
          {summary.documentsByType.length === 0 ? (
            <div className="flex h-36 items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">
              No document type data yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {documentTypes.map((item) => (
                <div key={item.typeCode}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium">
                      {item.typeName.replaceAll("_", " ")}
                    </span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(item.count / maxType) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm xl:col-span-3">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <p className="text-xs text-muted-foreground">Latest document events</p>
          </div>
          {summary.recentActivity.length === 0 ? (
            <div className="rounded-lg bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              No recent activity.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {recentActivity.map((item) => (
                <div key={item.id} className="rounded-lg border bg-background px-3 py-2.5">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.action} · {item.employeeName}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Recent uploads</h2>
            <p className="text-xs text-muted-foreground">
              Newest employee documents added to the system
            </p>
          </div>
          <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
            {summary.uploadedToday} today
          </span>
        </div>
        {recentUploads.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No uploads yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={TABLE_HEADER_STICKY_CLASS}>
                <tr className={TABLE_HEADER_ROW_CLASS}>
                  <th className={TABLE_HEADER_CELL_CLASS}>Employee</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>File</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>Type</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>Status</th>
                  <th className={cn(TABLE_HEADER_CELL_CLASS, "text-right")}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentUploads.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{item.employeeName}</td>
                    <td className="max-w-[14rem] truncate px-4 py-3">{item.fileName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.documentTypeName}
                    </td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge status={item.documentStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={
                          <Link href={DOCUMENTS_ROUTES.employeeDocument(item.employeeId)} />
                        }
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
