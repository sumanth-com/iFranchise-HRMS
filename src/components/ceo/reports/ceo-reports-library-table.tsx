"use client";

import { format } from "date-fns";
import {
  CalendarClock,
  Download,
  Eye,
  FileText,
  Share2,
} from "lucide-react";

import { Button } from "@/components/common/button";
import type { CeoReportLibraryRow } from "@/types/ceo-reports";
import { cn } from "@/lib/utils";

type CeoReportsLibraryTableProps = {
  rows: CeoReportLibraryRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onView: (runId: string) => void;
  onDownload: (runId: string) => void;
  onShare: (runId: string) => void;
  onSchedule: (reportKey: string) => void;
};

function formatLabel(value: string) {
  return value.replaceAll("_", " ").toUpperCase();
}

export function CeoReportsLibraryTable({
  rows,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onView,
  onDownload,
  onShare,
  onSchedule,
}: CeoReportsLibraryTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="w-full space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Recent Reports</h2>
        <p className="text-xs text-muted-foreground">
          Review insights in the side panel, then download or schedule delivery
        </p>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">
          Loading reports…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">
          No reports yet. Generate one above to get started.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className={cn(
                "flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm transition-opacity",
                isLoading && "opacity-60",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="block w-full truncate text-left text-sm font-semibold tracking-tight hover:text-primary"
                    onClick={() => onView(row.id)}
                  >
                    {row.reportName}
                  </button>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {row.categoryLabel}
                    {row.departmentName ? ` · ${row.departmentName}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                  {formatLabel(row.format)}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {format(new Date(row.createdAt), "d MMM yyyy")}
                </span>
                <span className="tabular-nums">
                  {row.downloadCount} download{row.downloadCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-1.5 border-t pt-3 sm:grid-cols-4">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 px-1.5 text-xs"
                  onClick={() => onView(row.id)}
                >
                  <Eye className="size-3.5" />
                  View
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 px-1.5 text-xs"
                  onClick={() => onDownload(row.id)}
                  disabled={row.status !== "completed"}
                >
                  <Download className="size-3.5" />
                  Download
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 px-1.5 text-xs"
                  onClick={() => onShare(row.id)}
                >
                  <Share2 className="size-3.5" />
                  Share
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 px-1.5 text-xs"
                  onClick={() => onSchedule(row.reportKey)}
                >
                  <CalendarClock className="size-3.5" />
                  Schedule
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {total > pageSize ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Showing {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="tabular-nums text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
