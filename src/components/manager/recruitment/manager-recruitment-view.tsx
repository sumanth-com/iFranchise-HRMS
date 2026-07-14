"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import { ManagerRecruitmentAnalytics } from "@/components/manager/recruitment/manager-recruitment-analytics";
import {
  ManagerRecruitmentCandidatesTable,
  type CandidateDrawerTab,
} from "@/components/manager/recruitment/manager-recruitment-candidates-table";
import { ManagerRecruitmentFilters } from "@/components/manager/recruitment/manager-recruitment-filters";
import { ManagerRecruitmentJobsTable } from "@/components/manager/recruitment/manager-recruitment-jobs-table";
import { ManagerRecruitmentKpis } from "@/components/manager/recruitment/manager-recruitment-kpis";
import { ManagerRecruitmentProfileDrawer } from "@/components/manager/recruitment/manager-recruitment-profile-drawer";
import { Button } from "@/components/common/button";
import {
  fetchTeamRecruitmentCandidatesAction,
  fetchTeamRecruitmentJobsAction,
  fetchTeamRecruitmentSummaryAction,
  rejectTeamCandidateAction,
} from "@/lib/manager/actions/manager-recruitment-actions";
import type {
  ManagerTeamRecruitmentPageData,
  TeamRecruitmentListParams,
} from "@/types/manager-recruitment";

type ViewMode = "candidates" | "jobs";

type ManagerRecruitmentViewProps = ManagerTeamRecruitmentPageData & {
  initialFilters: TeamRecruitmentListParams;
  managerEmployeeId: string;
  initialCandidateId?: string;
};

export function ManagerRecruitmentView({
  summary: initialSummary,
  jobs: initialJobs,
  candidates: initialCandidates,
  analytics,
  lookups,
  initialFilters,
  managerEmployeeId,
  initialCandidateId,
}: ManagerRecruitmentViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialFilters.view ?? "candidates");
  const [summary, setSummary] = useState(initialSummary);
  const [jobsState, setJobsState] = useState(initialJobs);
  const [candidatesState, setCandidatesState] = useState(initialCandidates);
  const [filters, setFilters] = useState<TeamRecruitmentListParams>(initialFilters);
  const [isPending, startTransition] = useTransition();
  const [drawerCandidateId, setDrawerCandidateId] = useState<string | null>(
    initialCandidateId ?? null,
  );
  const [drawerTab, setDrawerTab] = useState<CandidateDrawerTab>("profile");
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialCandidateId));

  const refreshData = useCallback((nextFilters: TeamRecruitmentListParams) => {
    startTransition(async () => {
      const [nextSummary, jobs, candidates] = await Promise.all([
        fetchTeamRecruitmentSummaryAction(),
        fetchTeamRecruitmentJobsAction({ ...nextFilters, view: "jobs" }),
        fetchTeamRecruitmentCandidatesAction({ ...nextFilters, view: "candidates" }),
      ]);
      setSummary(nextSummary);
      setJobsState(jobs);
      setCandidatesState(candidates);
    });
  }, []);

  function updateFilters(next: Partial<TeamRecruitmentListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    refreshData(merged);
  }

  function switchView(mode: ViewMode) {
    setViewMode(mode);
    updateFilters({ view: mode, page: 1 });
  }

  function openProfile(candidateId: string, tab: CandidateDrawerTab = "profile") {
    setDrawerCandidateId(candidateId);
    setDrawerTab(tab);
    setDrawerOpen(true);
  }

  function openCandidatesForJob(jobOpeningId: string) {
    setViewMode("candidates");
    updateFilters({ jobOpeningId, view: "candidates", page: 1 });
  }

  function handleReject(candidateId: string) {
    const reason = window.prompt("Enter rejection reason (min 3 characters):");
    if (!reason || reason.trim().length < 3) {
      toast.error("Rejection reason is required.");
      return;
    }

    startTransition(async () => {
      const result = await rejectTeamCandidateAction({ candidateId, reason: reason.trim() });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      refreshData(filters);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recruitment</h1>
        <p className="text-sm text-muted-foreground">
          Job openings, candidates, interviews, and offers for departments you manage only.
        </p>
      </div>

      <ManagerRecruitmentKpis summary={summary} />
      <ManagerRecruitmentFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        disabled={isPending}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant={viewMode === "candidates" ? "default" : "outline"}
          size="sm"
          onClick={() => switchView("candidates")}
        >
          Candidates
        </Button>
        <Button
          variant={viewMode === "jobs" ? "default" : "outline"}
          size="sm"
          onClick={() => switchView("jobs")}
        >
          Job Openings
        </Button>
      </div>

      {viewMode === "jobs" ? (
        <ManagerRecruitmentJobsTable
          records={jobsState.data}
          total={jobsState.total}
          page={jobsState.page}
          pageSize={jobsState.pageSize}
          isLoading={isPending}
          onPageChange={(page) => updateFilters({ page })}
          onViewCandidates={openCandidatesForJob}
        />
      ) : (
        <ManagerRecruitmentCandidatesTable
          records={candidatesState.data}
          total={candidatesState.total}
          page={candidatesState.page}
          pageSize={candidatesState.pageSize}
          isLoading={isPending}
          onPageChange={(page) => updateFilters({ page })}
          onViewProfile={openProfile}
          onReject={handleReject}
        />
      )}

      <ManagerRecruitmentAnalytics analytics={analytics} />

      <ManagerRecruitmentProfileDrawer
        candidateId={drawerCandidateId}
        initialTab={drawerTab}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        managerEmployeeId={managerEmployeeId}
        lookups={lookups}
        onActionComplete={() => refreshData(filters)}
      />
    </div>
  );
}
