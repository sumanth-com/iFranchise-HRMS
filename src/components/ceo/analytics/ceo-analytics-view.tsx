"use client";

import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { CeoAnalyticsAttendancePanel } from "@/components/ceo/analytics/ceo-analytics-attendance";
import { CeoAnalyticsFilters } from "@/components/ceo/analytics/ceo-analytics-filters";
import { CeoAnalyticsHiringPanel } from "@/components/ceo/analytics/ceo-analytics-hiring";
import { CeoAnalyticsInsights } from "@/components/ceo/analytics/ceo-analytics-insights";
import { CeoAnalyticsPayrollPanel } from "@/components/ceo/analytics/ceo-analytics-payroll";
import { CeoAnalyticsPerformancePanel } from "@/components/ceo/analytics/ceo-analytics-performance";
import { CeoAnalyticsSubNav } from "@/components/ceo/analytics/ceo-analytics-sub-nav";
import { CeoAnalyticsSummary } from "@/components/ceo/analytics/ceo-analytics-summary";
import { CeoAnalyticsWorkforcePanel } from "@/components/ceo/analytics/ceo-analytics-workforce";
import { Button } from "@/components/common/button";
import { SectionHelpButton } from "@/components/common/section-help-button";
import { ModuleShell } from "@/components/common/sticky-layout";
import {
  exportCeoAnalyticsAction,
  fetchCeoAnalyticsPageAction,
} from "@/lib/ceo/actions/ceo-analytics-actions";
import type { CeoAnalyticsSectionId } from "@/lib/ceo/constants";
import {
  CEO_ANALYTICS_SECTION_HELP,
  CEO_SECTION_HELP_DESCRIPTION,
} from "@/lib/ceo/section-help";
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
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function CeoAnalyticsView({
  kpis: initialKpis,
  workforce: initialWorkforce,
  hiring: initialHiring,
  performance: initialPerformance,
  attendance: initialAttendance,
  payroll: initialPayroll,
  insights: initialInsights,
  lookups,
  generatedAt: initialGeneratedAt,
  initialFilters,
}: CeoAnalyticsViewProps) {
  const [section, setSection] = useState<CeoAnalyticsSectionId>("overview");
  const [kpis, setKpis] = useState(initialKpis);
  const [workforce, setWorkforce] = useState(initialWorkforce);
  const [hiring, setHiring] = useState(initialHiring);
  const [performance, setPerformance] = useState(initialPerformance);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [payroll, setPayroll] = useState(initialPayroll);
  const [insights, setInsights] = useState(initialInsights);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [filters, setFilters] = useState<CeoAnalyticsListParams>(initialFilters);
  const [exporting, setExporting] = useState<CeoAnalyticsExportFormat | null>(null);

  const applyData = useCallback((data: CeoAnalyticsPageData) => {
    setKpis(data.kpis);
    setWorkforce(data.workforce);
    setHiring(data.hiring);
    setPerformance(data.performance);
    setAttendance(data.attendance);
    setPayroll(data.payroll);
    setInsights(data.insights);
    setGeneratedAt(data.generatedAt);
  }, []);

  const refresh = useCallback(
    async (nextFilters: CeoAnalyticsListParams) => {
      const data = await fetchCeoAnalyticsPageAction(nextFilters);
      applyData(data);
    },
    [applyData],
  );

  function updateFilters(next: Partial<CeoAnalyticsListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    void refresh(merged);
  }

  async function onExport(format: CeoAnalyticsExportFormat) {
    if (exporting) return;
    setExporting(format);
    try {
      const result = await exportCeoAnalyticsAction({ ...filters, format });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      downloadBase64(result.filename, result.mimeType, result.contentBase64);
      toast.success(`Downloaded ${result.filename}`);
    } catch {
      toast.error("Failed to export analytics");
    } finally {
      setExporting(null);
    }
  }

  return (
    <ModuleShell
      className="min-h-0 flex-1"
      header={<CeoAnalyticsSubNav value={section} onChange={setSection} />}
      fillContent
      contentClassName="px-0 py-0"
    >
      <div className="flex w-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto scroll-smooth p-3 pb-8 md:gap-4 md:p-4 md:pb-10 lg:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <SectionHelpButton
              title={CEO_ANALYTICS_SECTION_HELP.overview.title}
              points={[...CEO_ANALYTICS_SECTION_HELP.overview.points]}
              description={CEO_SECTION_HELP_DESCRIPTION}
            >
              <h1 className="text-2xl font-semibold tracking-tight">
                Executive Analytics
              </h1>
            </SectionHelpButton>
            <p className="mt-1 text-sm text-muted-foreground">
              Company health, workforce, hiring, attendance, performance, and payroll
              trends.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={exporting !== null}
              onClick={() => void onExport("pdf")}
            >
              {exporting === "pdf" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileText className="size-3.5" />
              )}
              PDF
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={exporting !== null}
              onClick={() => void onExport("excel")}
            >
              {exporting === "excel" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-3.5" />
              )}
              Excel
            </Button>
          </div>
        </div>

        {section === "overview" ? <CeoAnalyticsSummary kpis={kpis} /> : null}

        <CeoAnalyticsFilters
          filters={filters}
          lookups={lookups}
          onChange={updateFilters}
        />

        {section === "overview" ? (
          <CeoAnalyticsInsights insights={insights} />
        ) : null}
        {section === "workforce" ? (
          <CeoAnalyticsWorkforcePanel workforce={workforce} />
        ) : null}
        {section === "hiring" ? (
          <CeoAnalyticsHiringPanel hiring={hiring} />
        ) : null}
        {section === "attendance" ? (
          <CeoAnalyticsAttendancePanel attendance={attendance} />
        ) : null}
        {section === "performance" ? (
          <CeoAnalyticsPerformancePanel performance={performance} />
        ) : null}
        {section === "payroll" ? (
          <CeoAnalyticsPayrollPanel payroll={payroll} />
        ) : null}

        <p className="text-xs text-muted-foreground">
          Read-only · Generated {new Date(generatedAt).toLocaleString()}
        </p>
      </div>
    </ModuleShell>
  );
}
