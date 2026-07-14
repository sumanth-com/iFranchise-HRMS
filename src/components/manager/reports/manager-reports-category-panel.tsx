"use client";

import { Download, FileSpreadsheet, FileText, Loader2, Play, Printer } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  exportManagerReportAction,
  runManagerReportAction,
} from "@/lib/manager/actions/manager-reports-actions";
import { getManagerReportsForCategory } from "@/lib/manager/reports/manager-report-definitions";
import type { ManagerReportCategory } from "@/lib/manager/reports/manager-report-definitions";
import type { ManagerCategoryReportBundle } from "@/types/manager-reports";
import type { ReportExportFormat, ReportFilters, ReportKey, ReportResult } from "@/types/reports";

function downloadBase64(filename: string, mimeType: string, contentBase64: string) {
  const link = document.createElement("a");
  link.href = `data:${mimeType};base64,${contentBase64}`;
  link.download = filename;
  link.click();
}

type ManagerReportsCategoryPanelProps = {
  category: ManagerReportCategory;
  bundle: ManagerCategoryReportBundle | undefined;
  filters: ReportFilters;
  canExport: boolean;
};

export function ManagerReportsCategoryPanel({
  category,
  bundle,
  filters,
  canExport,
}: ManagerReportsCategoryPanelProps) {
  const definitions = getManagerReportsForCategory(category);
  const [reportKey, setReportKey] = useState<ReportKey | "">(definitions[0]?.key ?? "");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns = useMemo<DataTableColumn<Record<string, unknown>>[]>(() => {
    if (!result) return [];
    return result.columns.map((col) => ({
      key: col.key,
      header: col.header,
      render: (row) => {
        const value = row[col.key];
        if (value == null || value === "") return "—";
        return String(value);
      },
    }));
  }, [result]);

  const tableRows = useMemo(() => {
    if (!result) return [];
    return result.rows.map((row) => ({ ...row })) as Record<string, unknown>[];
  }, [result]);

  function runReport() {
    if (!reportKey) return;
    startTransition(async () => {
      const response = await runManagerReportAction(reportKey, filters);
      if (!response.success) {
        toast.error(response.message);
        return;
      }
      setResult(response.data);
      toast.success("Report generated.");
    });
  }

  function exportReport(format: ReportExportFormat) {
    if (!reportKey) return;
    startTransition(async () => {
      const response = await exportManagerReportAction(reportKey, filters, format);
      if (!response.success) {
        toast.error(response.message);
        return;
      }
      downloadBase64(response.filename, response.mimeType, response.contentBase64);
      toast.success(`Exported ${response.rowCount} rows.`);
    });
  }

  function printReport() {
    if (!result) {
      toast.error("Run the report before printing.");
      return;
    }
    const html = `
      <html><head><title>${result.title}</title></head><body>
      <h1>${result.title}</h1>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
      <thead><tr>${result.columns.map((col) => `<th>${col.header}</th>`).join("")}</tr></thead>
      <tbody>${result.rows
        .map(
          (row) =>
            `<tr>${result.columns.map((col) => `<td>${row[col.key] ?? ""}</td>`).join("")}</tr>`,
        )
        .join("")}</tbody></table></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold capitalize">{category.replace("_", " ")} metrics</h3>
        <p className="text-sm text-muted-foreground">Live metrics for your team only.</p>
      </div>

      {bundle?.metrics.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bundle.metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="text-lg font-semibold tabular-nums">
                {metric.value}
                {metric.suffix ?? ""}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No metrics" description="No data available for this category." />
      )}

      {definitions.length ? (
        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <Select
                value={reportKey}
                onValueChange={(value) => setReportKey(value as ReportKey)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report" />
                </SelectTrigger>
                <SelectContent>
                  {definitions.map((definition) => (
                    <SelectItem key={definition.key} value={definition.key}>
                      {definition.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runReport} disabled={isPending || !reportKey}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Run Report
            </Button>
            {canExport ? (
              <>
                <Button variant="outline" onClick={() => exportReport("pdf")} disabled={isPending}>
                  <FileText className="size-4" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={() => exportReport("excel")} disabled={isPending}>
                  <FileSpreadsheet className="size-4" />
                  Export Excel
                </Button>
                <Button variant="outline" onClick={() => exportReport("csv")} disabled={isPending}>
                  <Download className="size-4" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={printReport} disabled={isPending || !result}>
                  <Printer className="size-4" />
                  Print
                </Button>
              </>
            ) : null}
          </div>

          {result ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <p className="font-medium">{result.title}</p>
                <p className="text-muted-foreground">{result.total} rows</p>
              </div>
              <DataTable columns={columns} data={tableRows} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
