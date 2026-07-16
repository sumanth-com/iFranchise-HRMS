"use client";

import { useCallback, useState, useTransition } from "react";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoRecruitmentCandidatesTable } from "@/components/ceo/recruitment/ceo-recruitment-candidates-table";
import { CeoRecruitmentDrawer } from "@/components/ceo/recruitment/ceo-recruitment-drawer";
import { CeoRecruitmentFilters } from "@/components/ceo/recruitment/ceo-recruitment-filters";
import { CeoRecruitmentInsights } from "@/components/ceo/recruitment/ceo-recruitment-insights";
import { CeoRecruitmentInterviewsTable } from "@/components/ceo/recruitment/ceo-recruitment-interviews-table";
import { CeoRecruitmentJobsTable } from "@/components/ceo/recruitment/ceo-recruitment-jobs-table";
import { CeoRecruitmentPipeline } from "@/components/ceo/recruitment/ceo-recruitment-pipeline";
import { CeoRecruitmentSummary } from "@/components/ceo/recruitment/ceo-recruitment-summary";
import {
  fetchCeoRecruitmentCandidatesAction,
  fetchCeoRecruitmentInsightsAction,
  fetchCeoRecruitmentInterviewsAction,
  fetchCeoRecruitmentJobsAction,
  fetchCeoRecruitmentPipelineAction,
  getCeoRecruitmentModuleData,
} from "@/lib/ceo/actions/ceo-recruitment-actions";
import type {
  CeoRecruitmentListParams,
  CeoRecruitmentPageData,
} from "@/types/ceo-recruitment";

type CeoRecruitmentViewProps = CeoRecruitmentPageData & {
  initialFilters: CeoRecruitmentListParams;
};

const DEFAULT_FILTERS: CeoRecruitmentListParams = {
  page: 1,
  pageSize: 10,
};

export function CeoRecruitmentView({
  kpis: initialKpis,
  pipeline: initialPipeline,
  candidates: initialCandidates,
  interviews: initialInterviews,
  jobs: initialJobs,
  insights: initialInsights,
  lookups,
  initialFilters,
}: CeoRecruitmentViewProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [pipeline, setPipeline] = useState(initialPipeline);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [interviews, setInterviews] = useState(initialInterviews);
  const [jobs, setJobs] = useState(initialJobs);
  const [insights, setInsights] = useState(initialInsights);
  const [filters, setFilters] = useState<CeoRecruitmentListParams>(initialFilters);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refreshScopedData = useCallback((nextFilters: CeoRecruitmentListParams) => {
    startTransition(async () => {
      const [nextCandidates, nextPipeline, nextInterviews, nextJobs, nextInsights] =
        await Promise.all([
          fetchCeoRecruitmentCandidatesAction(nextFilters),
          fetchCeoRecruitmentPipelineAction(nextFilters),
          fetchCeoRecruitmentInterviewsAction(nextFilters),
          fetchCeoRecruitmentJobsAction(nextFilters),
          fetchCeoRecruitmentInsightsAction(nextFilters),
        ]);
      setCandidates(nextCandidates);
      setPipeline(nextPipeline);
      setInterviews(nextInterviews);
      setJobs(nextJobs);
      setInsights(nextInsights);
    });
  }, []);

  function updateFilters(next: Partial<CeoRecruitmentListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    refreshScopedData(merged);
  }

  function resetFilters() {
    const next = { ...DEFAULT_FILTERS };
    setFilters(next);
    startTransition(async () => {
      const data = await getCeoRecruitmentModuleData(next);
      setKpis(data.kpis);
      setPipeline(data.pipeline);
      setCandidates(data.candidates);
      setInterviews(data.interviews);
      setJobs(data.jobs);
      setInsights(data.insights);
    });
  }

  function openCandidate(candidateId: string) {
    setSelectedCandidateId(candidateId);
    setDrawerOpen(true);
  }

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <CeoBackToDashboard />
      <CeoModulePageHeader
        title="Recruitment"
        description="Monitor company-wide hiring progress, recruitment pipeline, interviews, and hiring performance."
      />

      <CeoRecruitmentSummary kpis={kpis} />

      <CeoRecruitmentFilters
        filters={filters}
        lookups={lookups}
        onChange={updateFilters}
        onReset={resetFilters}
        disabled={isPending}
      />

      <CeoRecruitmentPipeline
        stages={pipeline}
        selectedStage={filters.stage}
        onSelect={(stage) => updateFilters({ stage, page: 1 })}
      />

      <CeoRecruitmentInsights insights={insights} />

      <CeoRecruitmentCandidatesTable
        candidates={candidates.data}
        total={candidates.total}
        page={candidates.page}
        pageSize={candidates.pageSize}
        isLoading={isPending}
        onPageChange={(page) => updateFilters({ page })}
        onView={openCandidate}
      />

      <CeoRecruitmentInterviewsTable
        interviews={interviews}
        isLoading={isPending}
        onSelectCandidate={openCandidate}
      />

      <CeoRecruitmentJobsTable
        jobs={jobs}
        isLoading={isPending}
        onSelectJob={(jobOpeningId) => updateFilters({ jobOpeningId, page: 1 })}
      />

      <CeoRecruitmentDrawer
        candidateId={selectedCandidateId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
