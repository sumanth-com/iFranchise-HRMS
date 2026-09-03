"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { AttendanceSummaryCards } from "@/components/attendance/attendance-summary-cards";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import { SELF_ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import type {
  AttendanceListItem,
  AttendanceLookups,
  AttendanceStatus,
  AttendanceSummary,
  AttendanceHistoryCounts,
} from "@/types/attendance";
import type { LookupOption } from "@/types/employee";

function normalizeQuery(params: URLSearchParams) {
  const entries = Array.from(params.entries()).filter(([, value]) => value !== "");
  entries.sort(([a], [b]) => a.localeCompare(b));
  return new URLSearchParams(entries).toString();
}

type HrTeamAttendanceViewProps = {
  summary: AttendanceSummary;
  records: AttendanceListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  dateFrom?: string;
  dateTo?: string;
  today: string;
  departmentId?: string;
  attendanceStatus?: string;
  employeeId?: string;
  departments: LookupOption[];
  employees: LookupOption[];
  attendanceLookups?: AttendanceLookups;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  embedded?: boolean;
  teamRegularizationMode?: boolean;
  canApproveCorrections?: boolean;
  title?: string;
  description?: string;
  listBasePath?: string;
  onViewRecord?: (record: AttendanceListItem) => void;
  historyCounts?: AttendanceHistoryCounts;
};

export function HrTeamAttendanceView({
  summary,
  records,
  total,
  page,
  pageSize,
  search,
  dateFrom,
  dateTo,
  today,
  departmentId,
  attendanceStatus,
  employeeId,
  departments,
  employees,
  attendanceLookups,
  canCreate,
  canEdit,
  canDelete,
  teamRegularizationMode = false,
  canApproveCorrections = false,
  embedded = false,
  title = "Team Attendance",
  description = "Track daily attendance records, manual entries, and workforce presence across the organization.",
  listBasePath = SELF_ATTENDANCE_ROUTES.team,
  onViewRecord,
  historyCounts,
}: HrTeamAttendanceViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCardPending, startCardTransition] = useTransition();
  const lastCardQueryRef = useRef<string | null>(null);

  useEffect(() => {
    lastCardQueryRef.current = null;
  }, [attendanceStatus]);

  const applyStatusFilter = useCallback(
    (status: AttendanceStatus | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextStatus =
        status && status === attendanceStatus ? undefined : status;

      if (nextStatus) {
        params.set("attendanceStatus", nextStatus);
        if (!employeeId) {
          params.delete("employeeId");
          params.delete("search");
        }
      } else {
        params.delete("attendanceStatus");
      }
      params.set("page", "1");
      if (dateFrom && !params.get("dateFrom")) params.set("dateFrom", dateFrom);
      if (dateTo && !params.get("dateTo")) params.set("dateTo", dateTo);

      const query = normalizeQuery(params);
      const current = normalizeQuery(searchParams);
      if (query === current) return;
      if (lastCardQueryRef.current === query) return;
      lastCardQueryRef.current = query;

      startCardTransition(() => {
        router.replace(query ? `${listBasePath}?${query}` : listBasePath, {
          scroll: false,
        });
      });
    },
    [attendanceStatus, dateFrom, dateTo, employeeId, listBasePath, router, searchParams],
  );

  return (
    <div className="space-y-4">
      {!embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <span className="inline-flex h-9 items-center gap-2 whitespace-nowrap text-sm font-semibold text-foreground">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            Summary for {summary.date}
          </span>
        </div>
      ) : null}

      <AttendanceSummaryCards
        summary={summary}
        activeStatus={attendanceStatus}
        disabled={isCardPending}
        onSelect={applyStatusFilter}
      />

      <AttendanceTable
        records={records}
        total={total}
        page={page}
        pageSize={pageSize}
        search={search}
        dateFrom={dateFrom}
        dateTo={dateTo}
        today={today}
        departmentId={departmentId}
        attendanceStatus={attendanceStatus}
        employeeId={employeeId}
        departments={departments}
        employees={employees}
        attendanceLookups={attendanceLookups}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        teamRegularizationMode={teamRegularizationMode}
        canApproveCorrections={canApproveCorrections}
        listBasePath={listBasePath}
        onViewRecord={onViewRecord}
        summaryDate={summary.date}
        historyCounts={historyCounts}
      />
    </div>
  );
}
