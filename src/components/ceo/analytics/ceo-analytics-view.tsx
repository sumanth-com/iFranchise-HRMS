"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoAnalyticsAttendancePanel } from "@/components/ceo/analytics/ceo-analytics-attendance";
import { CeoAnalyticsFilters } from "@/components/ceo/analytics/ceo-analytics-filters";
import { CeoAnalyticsHiringPanel } from "@/components/ceo/analytics/ceo-analytics-hiring";
import {
  CeoAnalyticsComparisonPanel,
  CeoAnalyticsInsights,
} from "@/components/ceo/analytics/ceo-analytics-insights";
import { CeoAnalyticsPayrollPanel } from "@/components/ceo/analytics/ceo-analytics-payroll";
import { CeoAnalyticsPerformancePanel } from "@/components/ceo/analytics/ceo-analytics-performance";
import { CeoAnalyticsSummary } from "@/components/ceo/analytics/ceo-analytics-summary";
import { CeoAnalyticsWorkforcePanel } from "@/components/ceo/analytics/ceo-analytics-workforce";
import { Button } from "@/components/common/button";
import {
  exportCeoAnalyticsAction,
  fetchCeoAnalyticsPageAction,
} from "@/lib/ceo/actions/ceo-analytics-actions";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import type {
  CeoAnalyticsExportFormat,
  CeoAnalyticsListParams,
  CeoAnalyticsPageData,
} from "@/types/ceo-analytics";

type CeoAnalyticsViewProps = CeoAnalyticsPageData & {
  initialFilters: CeoAnalyticsListParams;
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

function defaultFilters(): CeoAnalyticsListParams {
  const today = getTodayDateString();
  const now = new Date(today);
  return {
    dateFrom: format(startOfMonth(now), "yyyy-MM-dd"),
    dateTo: format(endOfMonth(now), "yyyy-MM-dd"),
    compareMode: "none",
  };
}

export function CeoAnalyticsView({
  kpis: initialKpis,
  workforce: initialWorkforce,
  hiring: initialHiring,
  performance: initialPerformance,
  attendance: initialAttendance,
  payroll: initialPayroll,
  insights: initialInsights,
  comparison: initialComparison,
  lookups,
  generatedAt: initialGeneratedAt,
  initialFilters,
}: CeoAnalyticsViewProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [workforce, setWorkforce] = useState(initialWorkforce);
  const [hiring, setHiring] = useState(initialHiring);
  const [performance, setPerformance] = useState(initialPerformance);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [payroll, setPayroll] = useState(initialPayroll);
  const [insights, setInsights] = useState(initialInsights);
  const [comparison, setComparison] = useState(initialComparison);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [filters, setFilters] = useState<CeoAnalyticsListParams>(initialFilters);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const applyData = useCallback((data: CeoAnalyticsPageData) => {
    setKpis(data.kpis);
    setWorkforce(data.workforce);
    setHiring(data.hiring);
    setPerformance(data.performance);
    setAttendance(data.attendance);
    setPayroll(data.payroll);
    setInsights(data.insights);
    setComparison(data.comparison);
    setGeneratedAt(data.generatedAt);
  }, []);

  const refresh = useCallback(
    (nextFilters: CeoAnalyticsListParams) => {
      startTransition(async () => {
        const data = await fetchCeoAnalyticsPageAction(nextFilters);
        applyData(data);
      });
    },
    [applyData],
  );

  function updateFilters(next: Partial<CeoAnalyticsListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    refresh(merged);
  }

  function resetFilters() {
    const next = defaultFilters();
    setFilters(next);
    refresh(next);
  }

  function onExport(format: CeoAnalyticsExportFormat) {
    startTransition(async () => {
      const result = await exportCeoAnalyticsAction({ ...filters, format });
      if (!result.success) {
        setExportMessage(result.message);
        return;
      }
      downloadBase64(result.filename, result.mimeType, result.contentBase64);
      setExportMessage(`Exported ${result.filename}`);
    });
  }

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto scroll-smooth p-3 pb-8 md:gap-4 md:p-4 md:pb-10 lg:p-5">
      <CeoBackToDashboard />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <CeoModulePageHeader
          title="Executive Analytics"
          description="Company health, workforce, hiring, attendance, performance, and payroll trends."
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => onExport("pdf")}
          >
            <FileText className="size-3.5" />
            PDF
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => onExport("excel")}
          >
            <FileSpreadsheet className="size-3.5" />
            Excel
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => onExport("csv")}
          >
            <Download className="size-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => onExport("summary_pdf")}
          >
            <FileText className="size-3.5" />
            Summary PDF
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Read-only · Generated {new Date(generatedAt).toLocaleString()}
        {isPending ? " · Refreshing…" : ""}
      </p>

      <CeoAnalyticsSummary kpis={kpis} />

      <CeoAnalyticsFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        onReset={resetFilters}
        disabled={isPending}
      />

      {exportMessage ? (
        <p className="text-sm text-muted-foreground">{exportMessage}</p>
      ) : null}

      <CeoAnalyticsInsights insights={insights} />
      <CeoAnalyticsComparisonPanel comparison={comparison} />

      <CeoAnalyticsWorkforcePanel workforce={workforce} />
      <CeoAnalyticsHiringPanel hiring={hiring} />
      <CeoAnalyticsAttendancePanel attendance={attendance} />
      <CeoAnalyticsPerformancePanel performance={performance} />
      <CeoAnalyticsPayrollPanel payroll={payroll} />
    </div>
  );
}
