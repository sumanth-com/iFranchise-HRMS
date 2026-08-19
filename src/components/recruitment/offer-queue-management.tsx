"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { SectionHelpButton } from "@/components/common/section-help-button";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { OfferLetterWorkspace } from "@/components/recruitment/offer-letter-workspace";
import { RecruitmentPagination } from "@/components/recruitment/recruitment-pagination";
import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import { getCandidateDetailAction } from "@/lib/recruitment/actions";
import {
  CANDIDATE_STAGE_LABELS,
  OFFER_QUEUE_FILTER_LABELS,
  OFFER_QUEUE_STAGE_LABELS,
  OFFER_STATUS_LABELS,
} from "@/lib/recruitment/constants";
import { HIRING_SECTION_HELP } from "@/lib/recruitment/section-help";
import { cn } from "@/lib/utils";
import type {
  CandidateDetail,
  CandidateListItem,
  CandidateStage,
  OfferStatus,
  RecruitmentLookups,
} from "@/types/recruitment";

function offerQueueBadge(row: CandidateListItem) {
  if (row.latestOfferStatus) {
    return { label: OFFER_STATUS_LABELS[row.latestOfferStatus], status: row.latestOfferStatus };
  }
  if (row.stage === "ceo") {
    return { label: OFFER_QUEUE_STAGE_LABELS.ceo, status: "ceo" as CandidateStage };
  }
  return { label: "Pending send", status: "draft" as OfferStatus };
}

export function OfferQueueManagement({
  records,
  total,
  page,
  pageSize,
  lookups,
  initialSelected,
  canOffer,
  listOnly = false,
  filters,
}: {
  records: CandidateListItem[];
  total: number;
  page: number;
  pageSize: number;
  lookups: RecruitmentLookups;
  initialSelected: CandidateDetail | null;
  canOffer: boolean;
  listOnly?: boolean;
  filters: {
    search?: string;
    departmentId?: string;
    jobOpeningId?: string;
    offerQueue?: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected?.id ?? null);
  const [selectedDetail, setSelectedDetail] = useState<CandidateDetail | null>(initialSelected);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!initialSelected || !selectedId || initialSelected.id !== selectedId) return;
    setSelectedDetail((prev) => {
      if (!prev || prev.id !== initialSelected.id) return initialSelected;
      const richness =
        (d: CandidateDetail) => d.interviews.length + d.offers.length + d.timeline.length;
      return richness(initialSelected) >= richness(prev) ? initialSelected : prev;
    });
  }, [initialSelected, selectedId]);

  const syncCandidateUrl = useCallback(
    (candidateId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (candidateId) params.set("candidateId", candidateId);
      else params.delete("candidateId");
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `?${query}` : "?", { scroll: false });
      });
    },
    [router, searchParams, startTransition],
  );

  const refreshDetail = useCallback(async (candidateId: string) => {
    const result = await getCandidateDetailAction(candidateId);
    if (result.success) {
      setSelectedDetail(result.data);
    } else {
      toast.error(result.message);
    }
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition]);

  const loadCandidate = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setDetailLoading(true);
      syncCandidateUrl(id);

      const result = await getCandidateDetailAction(id);
      setDetailLoading(false);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      if (!["ceo", "offer"].includes(result.data.stage)) {
        toast.error("This candidate is not ready for offer");
        return;
      }
      setSelectedDetail(result.data);
    },
    [syncCandidateUrl],
  );

  function closePanel() {
    setSelectedId(null);
    setSelectedDetail(null);
    syncCandidateUrl(null);
  }

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.set("page", "1");
    startTransition(() => router.push(`?${params.toString()}`));
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="shrink-0">
        <SectionHelpButton
          title={HIRING_SECTION_HELP.offers.title}
          points={[...HIRING_SECTION_HELP.offers.points]}
        >
          <h1 className="text-2xl font-semibold tracking-tight">Offers</h1>
        </SectionHelpButton>
        <p className="mt-1 text-sm text-muted-foreground">
          {listOnly
            ? "Candidates who have reached offer — view who is in the offer queue."
            : "Unlocks after CEO stage — select a candidate, upload their offer letter, and send by email."}
        </p>
      </div>

      <div className="shrink-0 rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <Input
            placeholder="Search candidate..."
            defaultValue={filters.search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({ search: (e.target as HTMLInputElement).value || undefined });
              }
            }}
          />
          <LabeledSelect
            items={[
              { value: "all", label: "All positions" },
              ...lookups.jobs.map((j) => ({ value: j.id, label: j.label })),
            ]}
            value={filters.jobOpeningId ?? "all"}
            onValueChange={(v) => updateParams({ jobOpeningId: v === "all" ? undefined : v })}
          />
          <LabeledSelect
            items={Object.entries(OFFER_QUEUE_FILTER_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            value={filters.offerQueue ?? "all"}
            onValueChange={(v) => updateParams({ offerQueue: v === "all" ? undefined : v })}
          />
        </div>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-4",
          listOnly ? "grid-cols-1" : "xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]",
        )}
      >
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 border-b px-4 py-2.5 text-xs text-muted-foreground">
            {total} ready for offer
          </div>
          {records.length === 0 ? (
            <EmptyState
              title="No candidates ready for offer"
              description="Move candidates through CEO stage on the Candidates page to unlock offers here."
              className="border-0"
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              <ul className={cn("grid gap-2", listOnly && "md:grid-cols-2 xl:grid-cols-3")}>
                {records.map((row) => {
                  const isActive = !listOnly && selectedId === row.id;
                  const badge = offerQueueBadge(row);
                  const cardClass = cn(
                    "w-full rounded-lg border bg-background px-3 py-3 text-left",
                    listOnly
                      ? "cursor-default"
                      : "transition-all hover:border-primary/30 hover:shadow-sm",
                    isActive && "border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-sm",
                  );
                  const body = (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{row.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                        </div>
                        <RecruitmentStatusBadge label={badge.label} status={badge.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span>{row.jobTitle}</span>
                        <span>·</span>
                        <span>{CANDIDATE_STAGE_LABELS[row.stage]}</span>
                        {row.experienceYears != null ? (
                          <>
                            <span>·</span>
                            <span>{row.experienceYears} yrs</span>
                          </>
                        ) : null}
                      </div>
                    </>
                  );
                  return (
                    <li key={row.id}>
                      {listOnly ? (
                        <div className={cardClass}>{body}</div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => loadCandidate(row.id)}
                          className={cardClass}
                        >
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="shrink-0 border-t px-2 py-2">
            <RecruitmentPagination page={page} pageSize={pageSize} total={total} />
          </div>
        </div>

        {listOnly ? null : (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <OfferLetterWorkspace
              detail={selectedDetail}
              loading={detailLoading}
              canOffer={canOffer}
              offerEmailDefaults={lookups.offerEmailDefaults}
              onClose={closePanel}
              onRefresh={() => {
                if (selectedId) void refreshDetail(selectedId);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
