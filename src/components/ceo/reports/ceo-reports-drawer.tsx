"use client";

import { format } from "date-fns";
import { Download, FileText, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/common/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  downloadCeoReportAction,
  fetchCeoReportPreviewAction,
} from "@/lib/ceo/actions/ceo-reports-actions";
import type { CeoReportFormat, CeoReportPreview } from "@/types/ceo-reports";

type CeoReportsDrawerProps = {
  runId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloaded: () => void;
};

function downloadBase64(filename: string, mimeType: string, contentBase64: string) {
  const binary = atob(contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatPeriod(from: string | null, to: string | null) {
  if (!from && !to) return "All time";
  const fmt = (value: string) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : format(d, "d MMM yyyy");
  };
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  return fmt(from ?? to!);
}

function snapshotColumns(rows: Record<string, string | number | null>[]) {
  const keys = Object.keys(rows[0] ?? {});
  const preferred = ["metric", "Metric", "value", "Value", "section", "Section", "label", "Label"];
  const ordered = [
    ...preferred.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !preferred.includes(key)),
  ];
  return ordered.slice(0, 4);
}

const DOWNLOADS: { value: CeoReportFormat; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
  { value: "summary_pdf", label: "Exec Summary" },
  { value: "board_summary", label: "Board Pack" },
];

export function CeoReportsDrawer({
  runId,
  open,
  onOpenChange,
  onDownloaded,
}: CeoReportsDrawerProps) {
  const [detail, setDetail] = useState<CeoReportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isActing, startActing] = useTransition();

  useEffect(() => {
    if (!open || !runId) {
      setDetail(null);
      setError(null);
      setMessage(null);
      return;
    }

    startTransition(async () => {
      const result = await fetchCeoReportPreviewAction({ runId });
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  }, [open, runId]);

  function download(formatOption?: CeoReportFormat) {
    if (!detail) return;
    startActing(async () => {
      const result = await downloadCeoReportAction({
        runId: detail.id,
        format: formatOption,
      });
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      if (result.filename && result.mimeType && result.contentBase64) {
        downloadBase64(result.filename, result.mimeType, result.contentBase64);
      }
      setMessage("Download started.");
      onDownloaded();
    });
  }

  const insights =
    detail?.keyInsights.filter((insight) => {
      const text = insight.trim();
      if (!text) return false;
      if (/^\d+\s+rows?\s+included/i.test(text)) return false;
      if (/^0 rows/i.test(text)) return false;
      if (/^no (data|rows|preview)/i.test(text)) return false;
      return true;
    }) ?? [];

  const columns = detail?.previewRows.length
    ? snapshotColumns(detail.previewRows)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
          <SheetTitle className="text-base">Report Preview</SheetTitle>
        </SheetHeader>

        {isPending && !detail ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading report…
          </div>
        ) : error ? (
          <p className="flex-1 px-5 py-12 text-center text-sm text-destructive">
            {error}
          </p>
        ) : detail ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-5 py-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight">
                    {detail.reportName}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {detail.categoryLabel}
                    <span className="mx-1.5">·</span>
                    <span className="capitalize">{detail.status}</span>
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y py-4">
                <div>
                  <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Period
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {formatPeriod(detail.periodFrom, detail.periodTo)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Generated
                  </dt>
                  <dd className="mt-1 text-sm font-medium tabular-nums">
                    {format(new Date(detail.generatedAt), "d MMM yyyy HH:mm")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Prepared by
                  </dt>
                  <dd className="mt-1 text-sm font-medium">
                    {detail.generatedByName ?? "Chief Executive"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Records
                  </dt>
                  <dd className="mt-1 text-sm font-medium tabular-nums">
                    {detail.rowCount > 0 ? detail.rowCount.toLocaleString() : "—"}
                  </dd>
                </div>
              </dl>

              {insights.length > 0 ? (
                <section className="mt-5 space-y-2.5">
                  <h4 className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Key Insights
                  </h4>
                  <ul className="space-y-2">
                    {insights.slice(0, 4).map((insight) => (
                      <li
                        key={insight}
                        className="border-l-2 border-foreground/20 pl-3 text-sm leading-relaxed text-foreground"
                      >
                        {insight}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {detail.previewRows.length > 0 ? (
                <section className="mt-5 space-y-2.5">
                  <h4 className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Snapshot
                  </h4>
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left text-[10px] tracking-wide text-muted-foreground uppercase">
                        <tr>
                          {columns.map((key) => (
                            <th key={key} className="px-3 py-2.5 font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.previewRows.slice(0, 6).map((row, index) => (
                          <tr key={index} className="border-t">
                            {columns.map((key) => (
                              <td key={key} className="px-3 py-2.5 tabular-nums">
                                {row[key] ?? "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {message ? (
                <p className="mt-4 text-sm text-muted-foreground">{message}</p>
              ) : null}
            </div>

            <div className="shrink-0 border-t bg-background px-5 py-4">
              <p className="mb-2.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Download for review
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DOWNLOADS.map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    size="sm"
                    variant={item.value === detail.format ? "default" : "outline"}
                    disabled={isActing}
                    className="h-9 justify-center gap-1.5"
                    onClick={() => download(item.value)}
                  >
                    <Download className="size-3.5" />
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
