"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoApprovalsCategories } from "@/components/ceo/approvals/ceo-approvals-categories";
import { CeoApprovalsDrawer } from "@/components/ceo/approvals/ceo-approvals-drawer";
import { CeoApprovalsFilters } from "@/components/ceo/approvals/ceo-approvals-filters";
import { CeoApprovalsInsightsPanel } from "@/components/ceo/approvals/ceo-approvals-insights";
import { CeoApprovalsQueueTable } from "@/components/ceo/approvals/ceo-approvals-queue-table";
import { CeoApprovalsSummary } from "@/components/ceo/approvals/ceo-approvals-summary";
import {
  approveCeoApprovalAction,
  clarifyCeoApprovalAction,
  fetchCeoApprovalsCategoriesAction,
  fetchCeoApprovalsInsightsAction,
  fetchCeoApprovalsKpisAction,
  fetchCeoApprovalsQueueAction,
  getCeoApprovalsModuleData,
  rejectCeoApprovalAction,
} from "@/lib/ceo/actions/ceo-approvals-actions";
import type {
  CeoApprovalsListParams,
  CeoApprovalsPageData,
} from "@/types/ceo-approvals";

type CeoApprovalsViewProps = CeoApprovalsPageData & {
  initialFilters: CeoApprovalsListParams;
};

function defaultFilters(): CeoApprovalsListParams {
  return { page: 1, pageSize: 10 };
}

export function CeoApprovalsView({
  kpis: initialKpis,
  categories: initialCategories,
  queue: initialQueue,
  insights: initialInsights,
  lookups,
  initialFilters,
}: CeoApprovalsViewProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [categories, setCategories] = useState(initialCategories);
  const [queue, setQueue] = useState(initialQueue);
  const [insights, setInsights] = useState(initialInsights);
  const [filters, setFilters] = useState<CeoApprovalsListParams>(initialFilters);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, []);

  const refreshScopedData = useCallback((nextFilters: CeoApprovalsListParams) => {
    startTransition(async () => {
      const [nextKpis, nextCategories, nextQueue, nextInsights] = await Promise.all([
        fetchCeoApprovalsKpisAction(nextFilters),
        fetchCeoApprovalsCategoriesAction(nextFilters),
        fetchCeoApprovalsQueueAction(nextFilters),
        fetchCeoApprovalsInsightsAction(nextFilters),
      ]);
      setKpis(nextKpis);
      setCategories(nextCategories);
      setQueue(nextQueue);
      setInsights(nextInsights);
    });
  }, []);

  function updateFilters(next: Partial<CeoApprovalsListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);

    if ("search" in next) {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = window.setTimeout(() => {
        refreshScopedData(merged);
      }, 250);
      return;
    }

    refreshScopedData(merged);
  }

  function resetFilters() {
    const next = defaultFilters();
    setFilters(next);
    startTransition(async () => {
      const data = await getCeoApprovalsModuleData(next);
      setKpis(data.kpis);
      setCategories(data.categories);
      setQueue(data.queue);
      setInsights(data.insights);
    });
  }

  function openRequest(requestId: string) {
    setSelectedRequestId(requestId);
    setDrawerOpen(true);
  }

  function refreshAfterChange() {
    refreshScopedData(filters);
  }

  function runQuickAction(
    action: () => Promise<{ success: boolean; message: string }>,
    requestId: string,
  ) {
    startTransition(async () => {
      const result = await action();
      setActionMessage(result.message);
      if (!result.success) return;
      refreshScopedData(filters);
      setSelectedRequestId(requestId);
      setDrawerOpen(true);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <CeoBackToDashboard />
      <CeoModulePageHeader
        title="Executive Approvals"
        description="Review and decide on strategic approvals requiring CEO authorization."
      />

      <CeoApprovalsSummary kpis={kpis} />

      <CeoApprovalsFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        onReset={resetFilters}
        disabled={isPending}
      />

      <CeoApprovalsCategories
        categories={categories}
        activeType={filters.approvalType}
        onSelect={(approvalType) => updateFilters({ approvalType, page: 1 })}
      />

      {actionMessage ? (
        <p className="text-sm text-muted-foreground">{actionMessage}</p>
      ) : null}

      <CeoApprovalsQueueTable
        rows={queue.data}
        total={queue.total}
        page={queue.page}
        pageSize={queue.pageSize}
        isLoading={isPending}
        onPageChange={(page) => updateFilters({ page })}
        onView={openRequest}
        onApprove={(requestId) =>
          runQuickAction(
            () => approveCeoApprovalAction({ requestId }),
            requestId,
          )
        }
        onReject={(requestId) => {
          const reason = window.prompt("Rejection reason (required)");
          if (!reason || reason.trim().length < 3) return;
          runQuickAction(
            () => rejectCeoApprovalAction({ requestId, reason: reason.trim() }),
            requestId,
          );
        }}
        onClarify={(requestId) => {
          const reason = window.prompt("Clarification requested (required)");
          if (!reason || reason.trim().length < 3) return;
          runQuickAction(
            () => clarifyCeoApprovalAction({ requestId, reason: reason.trim() }),
            requestId,
          );
        }}
      />

      <CeoApprovalsInsightsPanel insights={insights} />

      <CeoApprovalsDrawer
        requestId={selectedRequestId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        forwardOptions={lookups.forwardTargets}
        onChanged={refreshAfterChange}
      />
    </div>
  );
}
