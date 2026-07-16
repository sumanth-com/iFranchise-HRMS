"use client";

import { useCallback, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoReportsBuilder } from "@/components/ceo/reports/ceo-reports-builder";
import { CeoReportsDrawer } from "@/components/ceo/reports/ceo-reports-drawer";
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

export function CeoReportsView({
  kpis: initialKpis,
  catalog,
  library: initialLibrary,
  schedules: initialSchedules,
  lookups,
  initialFilters,
}: CeoReportsViewProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [library, setLibrary] = useState(initialLibrary);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [filters, setFilters] = useState<CeoReportsListParams>(initialFilters);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scheduleReportKey, setScheduleReportKey] = useState<string | undefined>();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback((nextFilters: CeoReportsListParams) => {
    startTransition(async () => {
      const data = await fetchCeoReportsPageAction(nextFilters);
      setKpis(data.kpis);
      setLibrary(data.library);
      setSchedules(data.schedules);
    });
  }, []);

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
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto scroll-smooth p-3 pb-8 md:gap-4 md:p-4 md:pb-10 lg:p-5">
      <CeoBackToDashboard />
      <CeoModulePageHeader
        title="Executive Reports"
        description="Generate, schedule, and export leadership reports for board and executive reviews."
      />

      <CeoReportsSummary kpis={kpis} />

      {actionMessage ? (
        <p className="text-sm text-muted-foreground">{actionMessage}</p>
      ) : null}

      <CeoReportsBuilder
        catalog={catalog}
        lookups={lookups}
        disabled={isPending}
        onGenerated={(payload) => {
          setActionMessage(payload.message);
          refresh(filters);
          if (payload.runId) openPreview(payload.runId);
        }}
      />

      <CeoReportsLibraryTable
        rows={library.data}
        total={library.total}
        page={library.page}
        pageSize={library.pageSize}
        isLoading={isPending}
        onPageChange={(page) => {
          const next = { ...filters, page };
          setFilters(next);
          refresh(next);
        }}
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

      <div id="ceo-scheduled-reports">
        <CeoReportsSchedules
          schedules={schedules}
          catalog={catalog}
          initialReportKey={scheduleReportKey}
          onChanged={() => refresh(filters)}
        />
      </div>

      <CeoReportsDrawer
        runId={selectedRunId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onDownloaded={() => refresh(filters)}
      />
    </div>
  );
}
