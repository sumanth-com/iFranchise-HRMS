"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoApprovalsDrawer } from "@/components/ceo/approvals/ceo-approvals-drawer";
import { CeoApprovalsFilters } from "@/components/ceo/approvals/ceo-approvals-filters";
import { CeoApprovalsPanels } from "@/components/ceo/approvals/ceo-approvals-panels";
import { CeoApprovalsQueueTable } from "@/components/ceo/approvals/ceo-approvals-queue-table";
import { CeoApprovalsSummary } from "@/components/ceo/approvals/ceo-approvals-summary";
import {
  fetchCeoApprovalsCategoriesAction,
  fetchCeoApprovalsKpisAction,
  fetchCeoApprovalsQueueAction,
  getCeoApprovalsModuleData,
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
  lookups,
  initialFilters,
}: CeoApprovalsViewProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [categories, setCategories] = useState(initialCategories);
  const [queue, setQueue] = useState(initialQueue);
  const [filters, setFilters] = useState<CeoApprovalsListParams>(initialFilters);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, []);

  const refreshScopedData = useCallback((nextFilters: CeoApprovalsListParams) => {
    startTransition(async () => {
      const [nextKpis, nextCategories, nextQueue] = await Promise.all([
        fetchCeoApprovalsKpisAction(nextFilters),
        fetchCeoApprovalsCategoriesAction(nextFilters),
        fetchCeoApprovalsQueueAction(nextFilters),
      ]);
      setKpis(nextKpis);
      setCategories(nextCategories);
      setQueue(nextQueue);
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
    });
  }

  function openRequest(requestId: string) {
    setSelectedRequestId(requestId);
    setDrawerOpen(true);
  }

  function refreshAfterChange() {
    refreshScopedData(filters);
  }

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto scroll-smooth p-3 pb-8 md:gap-4 md:p-4 md:pb-10 lg:p-5">
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

      <CeoApprovalsPanels
        categories={categories}
        kpis={kpis}
        queueRows={queue.data}
        activeType={filters.approvalType}
        onSelectType={(approvalType) => updateFilters({ approvalType, page: 1 })}
        onView={openRequest}
      />

      <CeoApprovalsQueueTable
        rows={queue.data}
        total={queue.total}
        page={queue.page}
        pageSize={queue.pageSize}
        isLoading={isPending}
        onPageChange={(page) => updateFilters({ page })}
        onView={openRequest}
      />

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
