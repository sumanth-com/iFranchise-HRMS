"use client";

import { useCallback, useRef, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoReportsBuilder } from "@/components/ceo/reports/ceo-reports-builder";
import { CeoReportsCategories } from "@/components/ceo/reports/ceo-reports-categories";
import { CeoReportsDrawer } from "@/components/ceo/reports/ceo-reports-drawer";
import { CeoReportsFilters } from "@/components/ceo/reports/ceo-reports-filters";
import {
  CeoReportsHistory,
  CeoReportsInsightsPanel,
} from "@/components/ceo/reports/ceo-reports-history";
import { CeoReportsLibraryTable } from "@/components/ceo/reports/ceo-reports-library-table";
import { CeoReportsSchedules } from "@/components/ceo/reports/ceo-reports-schedules";
import { CeoReportsSummary } from "@/components/ceo/reports/ceo-reports-summary";
import {
  downloadCeoReportAction,
  fetchCeoReportsPageAction,
  shareCeoReportAction,
} from "@/lib/ceo/actions/ceo-reports-actions";
import type {
  CeoReportsListParams,
  CeoReportsPageData,
} from "@/types/ceo-reports";

type CeoReportsViewProps = CeoReportsPageData & {
  initialFilters: CeoReportsListParams;
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

function defaultFilters(): CeoReportsListParams {
  return { page: 1, pageSize: 10 };
}

export function CeoReportsView({
  kpis: initialKpis,
  catalog,
  library: initialLibrary,
  schedules: initialSchedules,
  history: initialHistory,
  insights: initialInsights,
  lookups,
  initialFilters,
}: CeoReportsViewProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [library, setLibrary] = useState(initialLibrary);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [history, setHistory] = useState(initialHistory);
  const [insights, setInsights] = useState(initialInsights);
  const [filters, setFilters] = useState<CeoReportsListParams>(initialFilters);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scheduleReportKey, setScheduleReportKey] = useState<string | undefined>();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchTimerRef = useRef<number | null>(null);

  const refresh = useCallback((nextFilters: CeoReportsListParams) => {
    startTransition(async () => {
      const data = await fetchCeoReportsPageAction(nextFilters);
      setKpis(data.kpis);
      setLibrary(data.library);
      setSchedules(data.schedules);
      setHistory(data.history);
      setInsights(data.insights);
    });
  }, []);

  function updateFilters(next: Partial<CeoReportsListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    if ("search" in next) {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = window.setTimeout(() => refresh(merged), 250);
      return;
    }
    refresh(merged);
  }

  function resetFilters() {
    const next = defaultFilters();
    setFilters(next);
    refresh(next);
  }

  function openPreview(runId: string) {
    setSelectedRunId(runId);
    setDrawerOpen(true);
  }

  function onDownload(runId: string) {
    startTransition(async () => {
      const result = await downloadCeoReportAction({ runId });
      if (!result.success) {
        setActionMessage(result.message);
        return;
      }
      if (result.filename && result.mimeType && result.contentBase64) {
        downloadBase64(result.filename, result.mimeType, result.contentBase64);
      }
      setActionMessage("Download started.");
      refresh(filters);
    });
  }

  function onShare(runId: string) {
    const emails = window.prompt(
      "Share with recipient emails (comma-separated). Recipients must be employees in this organization.",
    );
    if (!emails) return;
    const recipientEmails = emails
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    startTransition(async () => {
      const result = await shareCeoReportAction({ runId, recipientEmails });
      setActionMessage(result.message);
      if (result.success) refresh(filters);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <CeoBackToDashboard />
      <CeoModulePageHeader
        title="Executive Reports"
        description="Generate, schedule and export executive business reports for leadership and board meetings."
      />

      <CeoReportsSummary kpis={kpis} />

      <CeoReportsFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        onReset={resetFilters}
        disabled={isPending}
      />

      <CeoReportsCategories
        catalog={catalog}
        activeCategory={filters.category}
        onSelect={(category) => updateFilters({ category, page: 1 })}
      />

      {actionMessage ? (
        <p className="text-sm text-muted-foreground">{actionMessage}</p>
      ) : null}

      <CeoReportsLibraryTable
        rows={library.data}
        total={library.total}
        page={library.page}
        pageSize={library.pageSize}
        isLoading={isPending}
        onPageChange={(page) => updateFilters({ page })}
        onView={openPreview}
        onDownload={onDownload}
        onShare={onShare}
        onSchedule={(reportKey) => {
          setScheduleReportKey(reportKey);
          document
            .getElementById("ceo-scheduled-reports")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <CeoReportsBuilder
        catalog={
          filters.category
            ? catalog.filter((item) => item.category === filters.category)
            : catalog
        }
        lookups={lookups}
        disabled={isPending}
        onGenerated={(payload) => {
          setActionMessage(payload.message);
          refresh(filters);
          if (payload.runId) openPreview(payload.runId);
        }}
      />

      <div id="ceo-scheduled-reports">
        <CeoReportsSchedules
          schedules={schedules}
          catalog={catalog}
          initialReportKey={scheduleReportKey}
          onChanged={() => refresh(filters)}
        />
      </div>

      <CeoReportsHistory history={history} />
      <CeoReportsInsightsPanel insights={insights} />

      <CeoReportsDrawer
        runId={selectedRunId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onDownloaded={() => refresh(filters)}
      />
    </div>
  );
}
