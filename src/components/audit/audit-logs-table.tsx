"use client";

import { format } from "date-fns";
import { Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button, buttonVariants } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { AuditExportButtons } from "@/components/audit/audit-export-buttons";
import { AuditStatusBadge } from "@/components/audit/audit-status-badge";
import {
  AUDIT_ROUTES,
  formatAuditAction,
  formatAuditModule,
} from "@/lib/audit/constants";
import { formatAuditRecordLabel } from "@/lib/audit/display";
import { humanizeActivityDescription } from "@/lib/common/display-text";
import { cn } from "@/lib/utils";
import type { AuditListItem, AuditListResult } from "@/types/audit";

const ROW_GRID =
  "grid grid-cols-[6.5rem_minmax(0,1.15fr)_minmax(0,1fr)_6.25rem_4.75rem] items-start gap-x-5 gap-y-2 px-4 sm:gap-x-8 sm:px-5";

type Props = {
  result: AuditListResult;
  canExport: boolean;
  filters: Record<string, string | undefined>;
};

function AuditLogRow({ row }: { row: AuditListItem }) {
  const moduleLabel = formatAuditModule(row.module);
  const actionLabel = formatAuditAction(row.action);
  const record = formatAuditRecordLabel(row);
  const description = humanizeActivityDescription(row.description, "");

  return (
    <article className={cn(ROW_GRID, "border-b border-border/70 py-4 last:border-b-0 hover:bg-muted/20")}>
      <div className="text-xs text-muted-foreground sm:text-sm">
        <p className="font-medium text-foreground">{format(new Date(row.occurredAt), "dd MMM yyyy")}</p>
        <p>{format(new Date(row.occurredAt), "HH:mm:ss")}</p>
      </div>

      <div className="min-w-0 space-y-1.5 pr-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-foreground">{row.userName ?? "System"}</p>
          {row.roleName ? (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {row.roleName}
            </span>
          ) : null}
        </div>

        {description ? (
          <p className="line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">—</p>
        )}
      </div>

      <div className="min-w-0 space-y-1 pr-2">
        <p className="text-sm font-medium leading-snug text-foreground">
          {moduleLabel} · {actionLabel}
        </p>
        <p className="line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground">{record}</p>
      </div>

      <div className="flex justify-center pt-0.5">
        <AuditStatusBadge status={row.eventStatus} />
      </div>

      <div className="flex justify-end pt-0.5">
        <Link
          href={AUDIT_ROUTES.detail(row.id)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1.5 px-2.5")}
          title="View audit detail"
        >
          <Eye className="size-3.5" />
          View
        </Link>
      </div>
    </article>
  );
}

export function AuditLogsTable({ result, canExport, filters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${AUDIT_ROUTES.logs}?${params.toString()}`);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{result.total} audit entries</p>
        {canExport ? <AuditExportButtons filters={filters} disabled={isPending} /> : null}
      </div>

      {result.items.length === 0 ? (
        <EmptyState title="No audit logs" description="Activity will appear here as users interact with the HRMS." />
      ) : (
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div
            className="max-h-[min(68dvh,42rem)] overflow-y-auto overscroll-contain scroll-smooth"
            aria-label="Audit log entries"
          >
            <header
              className={cn(
                ROW_GRID,
                "sticky top-0 z-10 border-b bg-muted/95 py-3.5 text-[11px] font-semibold tracking-wide text-foreground uppercase shadow-sm backdrop-blur supports-[backdrop-filter]:bg-muted/85",
              )}
            >
              <span>Time</span>
              <span>Activity</span>
              <span>Event</span>
              <span className="text-center">Status</span>
              <span className="text-right">View</span>
            </header>

            <div className={cn(isPending && "pointer-events-none opacity-60")}>
              {result.items.map((row) => (
                <AuditLogRow key={row.id} row={row} />
              ))}
            </div>
          </div>
        </div>
      )}

      {result.total > result.pageSize ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Page {result.page}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={result.page <= 1 || isPending}
              onClick={() => setPage(result.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={result.page * result.pageSize >= result.total || isPending}
              onClick={() => startTransition(() => setPage(result.page + 1))}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Next"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
