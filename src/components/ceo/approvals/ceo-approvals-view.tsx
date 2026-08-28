"use client";

import { useCallback, useState } from "react";

import { SectionHelpButton } from "@/components/common/section-help-button";
import { CeoApprovalsDrawer } from "@/components/ceo/approvals/ceo-approvals-drawer";
import { CeoApprovalsFilters } from "@/components/ceo/approvals/ceo-approvals-filters";
import { CeoApprovalsQueueTable } from "@/components/ceo/approvals/ceo-approvals-queue-table";
import { CeoApprovalsSummary } from "@/components/ceo/approvals/ceo-approvals-summary";
import {
  fetchCeoApprovalsKpisAction,
  fetchCeoApprovalsQueueAction,
} from "@/lib/ceo/actions/ceo-approvals-actions";
import { useApprovalsSync } from "@/lib/approvals/use-approvals-sync";
import type {
  CeoApprovalsListParams,
  CeoApprovalsPageData,
} from "@/types/ceo-approvals";
import {
  CEO_APPROVALS_SECTION_HELP,
  CEO_SECTION_HELP_DESCRIPTION,
} from "@/lib/ceo/section-help";

type CeoApprovalsViewProps = CeoApprovalsPageData & {
  initialFilters: CeoApprovalsListParams;
};

export function CeoApprovalsView({
  kpis: initialKpis,
  queue: initialQueue,
  lookups,
  initialFilters,
}: CeoApprovalsViewProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [queue, setQueue] = useState(initialQueue);
  const [filters, setFilters] = useState<CeoApprovalsListParams>(initialFilters);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refreshQueue = useCallback(async (nextFilters: CeoApprovalsListParams) => {
    const nextQueue = await fetchCeoApprovalsQueueAction(nextFilters);
    setQueue(nextQueue);
  }, []);

  function updateFilters(next: Partial<CeoApprovalsListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    void refreshQueue(merged);
  }

  function openRequest(requestId: string) {
    setSelectedRequestId(requestId);
    setDrawerOpen(true);
  }

  const refreshAfterChange = useCallback(async () => {
    const [nextKpis, nextQueue] = await Promise.all([
      fetchCeoApprovalsKpisAction(filters),
      fetchCeoApprovalsQueueAction(filters),
    ]);
    setKpis(nextKpis);
    setQueue(nextQueue);
  }, [filters]);

  useApprovalsSync({
    onRefresh: refreshAfterChange,
    tables: ["executive_approvals"],
  });

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto scroll-smooth p-3 pb-8 md:gap-4 md:p-4 md:pb-10 lg:p-5">
      <div>
        <SectionHelpButton
          title={CEO_APPROVALS_SECTION_HELP.executive.title}
          points={[...CEO_APPROVALS_SECTION_HELP.executive.points]}
          description={CEO_SECTION_HELP_DESCRIPTION}
        >
          <h1 className="text-2xl font-semibold tracking-tight">Executive Approvals</h1>
        </SectionHelpButton>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and decide on employee promotions requiring CEO authorization.
        </p>
      </div>

      <CeoApprovalsSummary kpis={kpis} />

      <CeoApprovalsFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
      />

      <CeoApprovalsQueueTable
        rows={queue.data}
        total={queue.total}
        page={queue.page}
        pageSize={queue.pageSize}
        onPageChange={(page) => updateFilters({ page })}
        onView={openRequest}
      />

      <CeoApprovalsDrawer
        requestId={selectedRequestId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        forwardOptions={lookups.forwardTargets}
        onChanged={() => {
          void refreshAfterChange();
        }}
      />
    </div>
  );
}
