"use client";

import { format } from "date-fns";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { ManagerAttendanceDetailDrawer } from "@/components/manager/attendance/manager-attendance-detail-drawer";
import { ManagerAttendanceFilters } from "@/components/manager/attendance/manager-attendance-filters";
import { ManagerAttendanceKpis } from "@/components/manager/attendance/manager-attendance-kpis";
import { ManagerAttendanceMonthlyTable } from "@/components/manager/attendance/manager-attendance-monthly-table";
import { ManagerAttendanceMonthlyExport } from "@/components/manager/attendance/manager-attendance-monthly-export";
import { ManagerAttendanceTable } from "@/components/manager/attendance/manager-attendance-table";
import {
  approveTeamAttendanceCorrectionAction,
  fetchTeamAttendanceAction,
  fetchTeamAttendanceSummaryAction,
  fetchTeamMonthlyAttendanceAction,
  rejectTeamAttendanceCorrectionAction,
} from "@/lib/manager/actions/manager-attendance-actions";
import type {
  ManagerTeamAttendancePageData,
  TeamAttendanceListParams,
} from "@/types/manager-attendance";

type ViewMode = "daily" | "monthly";

type ManagerAttendanceViewProps = ManagerTeamAttendancePageData & {
  initialFilters: TeamAttendanceListParams;
  today: string;
};

export function ManagerAttendanceView({
  summary: initialSummary,
  records: initialRecords,
  lookups,
  monthlySummary: initialMonthlySummary,
  initialFilters,
  today,
}: ManagerAttendanceViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [summary, setSummary] = useState(initialSummary);
  const [tableState, setTableState] = useState(initialRecords);
  const [monthlySummary, setMonthlySummary] = useState(initialMonthlySummary);
  const [filters, setFilters] = useState<TeamAttendanceListParams>(initialFilters);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isPending, startTransition] = useTransition();
  const [drawerAttendanceId, setDrawerAttendanceId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [pendingCorrectionId, setPendingCorrectionId] = useState<string | null>(null);

  const refreshData = useCallback(
    (nextFilters: TeamAttendanceListParams) => {
      startTransition(async () => {
        const [records, nextSummary] = await Promise.all([
          fetchTeamAttendanceAction(nextFilters),
          fetchTeamAttendanceSummaryAction(nextFilters.dateFrom, nextFilters.dateTo),
        ]);
        setTableState(records);
        setSummary(nextSummary);
      });
    },
    [],
  );

  function updateFilters(next: Partial<TeamAttendanceListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    refreshData(merged);
  }

  function refreshMonthly(nextMonth = month, nextYear = year) {
    startTransition(async () => {
      const rows = await fetchTeamMonthlyAttendanceAction({
        month: nextMonth,
        year: nextYear,
      });
      setMonthlySummary(rows);
    });
  }

  useEffect(() => {
    if (viewMode === "monthly") {
      refreshMonthly(month, year);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, month, year]);

  function openDetails(attendanceId: string) {
    setDrawerAttendanceId(attendanceId);
    setDrawerOpen(true);
  }

  function handleQuickReview(correctionId: string, approve: boolean) {
    startTransition(async () => {
      const action = approve
        ? approveTeamAttendanceCorrectionAction
        : rejectTeamAttendanceCorrectionAction;
      const result = await action({
        correctionId,
        reviewNotes: reviewNotes.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setPendingCorrectionId(null);
      setReviewNotes("");
      refreshData(filters);
    });
  }

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Attendance for employees in your reporting hierarchy only.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
          <Button
            size="sm"
            variant={viewMode === "daily" ? "default" : "ghost"}
            onClick={() => setViewMode("daily")}
          >
            Daily Attendance
          </Button>
          <Button
            size="sm"
            variant={viewMode === "monthly" ? "default" : "ghost"}
            onClick={() => setViewMode("monthly")}
          >
            Monthly Summary
          </Button>
        </div>
      </div>

      {viewMode === "daily" ? (
        <>
          <ManagerAttendanceKpis summary={summary} />

          <ManagerAttendanceFilters
            filters={filters}
            lookups={lookups}
            today={today}
            onChange={updateFilters}
            disabled={isPending}
          />

          {pendingCorrectionId ? (
            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-sm font-medium">Review regularization</p>
              <p className="text-xs text-muted-foreground">
                Add optional remarks before approving or rejecting.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Input
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  placeholder="Approval remarks (optional)"
                  className="max-w-md"
                />
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleQuickReview(pendingCorrectionId, true)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => handleQuickReview(pendingCorrectionId, false)}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPendingCorrectionId(null);
                    setReviewNotes("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </section>
          ) : null}

          <ManagerAttendanceTable
            records={tableState.data}
            total={tableState.total}
            page={tableState.page}
            pageSize={tableState.pageSize}
            isLoading={isPending}
            onPageChange={(page) => updateFilters({ page })}
            onViewDetails={openDetails}
            onApproveRegularization={(correctionId) => {
              setPendingCorrectionId(correctionId);
              setReviewNotes("");
            }}
            onRejectRegularization={(correctionId) => {
              setPendingCorrectionId(correctionId);
              setReviewNotes("");
            }}
          />
        </>
      ) : (
        <>
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="month-select" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Month
                  </label>
                  <Input
                    id="month-select"
                    type="month"
                    value={`${year}-${String(month).padStart(2, "0")}`}
                    onChange={(event) => {
                      const [nextYear, nextMonth] = event.target.value.split("-").map(Number);
                      if (nextYear && nextMonth) {
                        setYear(nextYear);
                        setMonth(nextMonth);
                      }
                    }}
                  />
                </div>
                <Button size="sm" disabled={isPending} onClick={() => refreshMonthly()}>
                  Refresh
                </Button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
                <p className="text-sm text-muted-foreground">
                  Summary for <span className="font-medium text-foreground">{monthLabel}</span>
                  {" · "}
                  <span className="font-medium text-foreground">{monthlySummary.length}</span>{" "}
                  team member{monthlySummary.length === 1 ? "" : "s"}
                </p>
                <ManagerAttendanceMonthlyExport
                  rows={monthlySummary}
                  monthLabel={monthLabel}
                  disabled={isPending}
                />
              </div>
            </div>
          </section>

          <ManagerAttendanceMonthlyTable rows={monthlySummary} />
        </>
      )}

      <ManagerAttendanceDetailDrawer
        attendanceId={drawerAttendanceId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onReviewComplete={() => refreshData(filters)}
      />
    </div>
  );
}
