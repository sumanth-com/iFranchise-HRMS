"use client";

import { format, startOfWeek } from "date-fns";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { ManagerLeaveCalendar } from "@/components/manager/leave/manager-leave-calendar";
import { ManagerLeaveDetailDrawer } from "@/components/manager/leave/manager-leave-detail-drawer";
import { ManagerLeaveFilters } from "@/components/manager/leave/manager-leave-filters";
import { ManagerLeaveKpis } from "@/components/manager/leave/manager-leave-kpis";
import { ManagerLeaveTable } from "@/components/manager/leave/manager-leave-table";
import {
  approveTeamLeaveRequestAction,
  fetchTeamLeaveCalendarAction,
  fetchTeamLeaveRequestsAction,
  fetchTeamLeaveSummaryAction,
  rejectTeamLeaveRequestAction,
} from "@/lib/manager/actions/manager-leave-actions";
import type {
  ManagerTeamLeavePageData,
  TeamLeaveListParams,
} from "@/types/manager-leave";
import type { LeaveCalendarEntry, LeaveHolidayEntry } from "@/types/leave";

type ViewMode = "requests" | "calendar";

type ManagerLeaveViewProps = ManagerTeamLeavePageData & {
  initialFilters: TeamLeaveListParams;
  initialLeaveId?: string;
};

export function ManagerLeaveView({
  summary: initialSummary,
  records: initialRecords,
  lookups,
  calendar: initialCalendar,
  initialFilters,
  initialLeaveId,
}: ManagerLeaveViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("requests");
  const [summary, setSummary] = useState(initialSummary);
  const [tableState, setTableState] = useState(initialRecords);
  const [filters, setFilters] = useState<TeamLeaveListParams>(initialFilters);
  const [calendarMode, setCalendarMode] = useState<"monthly" | "weekly">("monthly");
  const [calendarMonth, setCalendarMonth] = useState(initialCalendar.month);
  const [calendarYear, setCalendarYear] = useState(initialCalendar.year);
  const [weekStart, setWeekStart] = useState(
    format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd"),
  );
  const [calendarLeaves, setCalendarLeaves] = useState<LeaveCalendarEntry[]>(
    initialCalendar.leaves,
  );
  const [calendarHolidays, setCalendarHolidays] = useState<LeaveHolidayEntry[]>(
    initialCalendar.holidays,
  );
  const [isPending, startTransition] = useTransition();
  const [drawerLeaveId, setDrawerLeaveId] = useState<string | null>(
    initialLeaveId ?? null,
  );
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialLeaveId));
  const [pendingAction, setPendingAction] = useState<{
    leaveRequestId: string;
    mode: "approve" | "reject";
  } | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  const refreshRequests = useCallback((nextFilters: TeamLeaveListParams) => {
    startTransition(async () => {
      const [records, nextSummary] = await Promise.all([
        fetchTeamLeaveRequestsAction(nextFilters),
        fetchTeamLeaveSummaryAction(),
      ]);
      setTableState(records);
      setSummary(nextSummary);
    });
  }, []);

  const refreshCalendar = useCallback(
    (month: number, year: number) => {
      startTransition(async () => {
        const data = await fetchTeamLeaveCalendarAction({ month, year });
        setCalendarLeaves(data.leaves);
        setCalendarHolidays(data.holidays);
      });
    },
    [],
  );

  useEffect(() => {
    if (viewMode === "calendar") {
      refreshCalendar(calendarMonth, calendarYear);
    }
  }, [viewMode, calendarMonth, calendarYear, refreshCalendar]);

  function updateFilters(next: Partial<TeamLeaveListParams>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    refreshRequests(merged);
  }

  function openDetails(leaveRequestId: string) {
    setDrawerLeaveId(leaveRequestId);
    setDrawerOpen(true);
  }

  function handleQuickAction() {
    if (!pendingAction) return;

    startTransition(async () => {
      const action =
        pendingAction.mode === "approve"
          ? approveTeamLeaveRequestAction
          : rejectTeamLeaveRequestAction;

      const payload =
        pendingAction.mode === "approve"
          ? {
              leaveRequestId: pendingAction.leaveRequestId,
              comments: actionNotes.trim() || undefined,
            }
          : {
              leaveRequestId: pendingAction.leaveRequestId,
              reason: actionNotes.trim(),
            };

      if (pendingAction.mode === "reject" && actionNotes.trim().length < 3) {
        toast.error("Rejection reason is required.");
        return;
      }

      const result = await action(payload);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setPendingAction(null);
      setActionNotes("");
      refreshRequests(filters);
      if (viewMode === "calendar") {
        refreshCalendar(calendarMonth, calendarYear);
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Leave</h1>
          <p className="text-sm text-muted-foreground">
            Leave requests from your reporting hierarchy only.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
          <Button
            size="sm"
            variant={viewMode === "requests" ? "default" : "ghost"}
            onClick={() => setViewMode("requests")}
          >
            Leave Requests
          </Button>
          <Button
            size="sm"
            variant={viewMode === "calendar" ? "default" : "ghost"}
            onClick={() => setViewMode("calendar")}
          >
            Leave Calendar
          </Button>
        </div>
      </div>

      <ManagerLeaveKpis summary={summary} />

      {viewMode === "requests" ? (
        <>
          <ManagerLeaveFilters
            filters={filters}
            lookups={lookups}
            onChange={updateFilters}
            disabled={isPending}
          />

          {pendingAction ? (
            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-sm font-medium">
                {pendingAction.mode === "approve"
                  ? "Approve leave request"
                  : "Reject leave request"}
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Input
                  value={actionNotes}
                  onChange={(event) => setActionNotes(event.target.value)}
                  placeholder={
                    pendingAction.mode === "approve"
                      ? "Approval notes (optional)"
                      : "Rejection reason"
                  }
                  className="max-w-md"
                />
                <Button size="sm" disabled={isPending} onClick={handleQuickAction}>
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPendingAction(null);
                    setActionNotes("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </section>
          ) : null}

          <ManagerLeaveTable
            records={tableState.data}
            total={tableState.total}
            page={tableState.page}
            pageSize={tableState.pageSize}
            isLoading={isPending}
            onPageChange={(page) => updateFilters({ page })}
            onViewDetails={openDetails}
            onApprove={(leaveRequestId) => {
              setPendingAction({ leaveRequestId, mode: "approve" });
              setActionNotes("");
            }}
            onReject={(leaveRequestId) => {
              setPendingAction({ leaveRequestId, mode: "reject" });
              setActionNotes("");
            }}
          />
        </>
      ) : (
        <ManagerLeaveCalendar
          leaves={calendarLeaves}
          holidays={calendarHolidays}
          month={calendarMonth}
          year={calendarYear}
          mode={calendarMode}
          onModeChange={setCalendarMode}
          onMonthChange={(month, year) => {
            setCalendarMonth(month);
            setCalendarYear(year);
          }}
          weekStart={weekStart}
          onWeekChange={setWeekStart}
        />
      )}

      <ManagerLeaveDetailDrawer
        leaveRequestId={drawerLeaveId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onActionComplete={() => {
          refreshRequests(filters);
          if (viewMode === "calendar") {
            refreshCalendar(calendarMonth, calendarYear);
          }
        }}
      />
    </div>
  );
}
