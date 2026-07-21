"use client";

import { Suspense } from "react";
import { CalendarDays } from "lucide-react";

import { AttendanceSummaryCards } from "@/components/attendance/attendance-summary-cards";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { SELF_ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import type { AttendanceListItem, AttendanceSummary } from "@/types/attendance";
import type { LookupOption } from "@/types/employee";

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
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  embedded?: boolean;
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
  canCreate,
  canEdit,
  canDelete,
  embedded = false,
}: HrTeamAttendanceViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          {embedded ? (
            <h2 className="text-lg font-semibold tracking-tight">Team Attendance</h2>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">Team Attendance</h1>
          )}
          <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays className="size-4 shrink-0" />
            Summary for {summary.date}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Track daily attendance records, manual entries, and workforce presence across the
          organization.
        </p>
      </div>

      <AttendanceSummaryCards summary={summary} />

      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
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
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          listBasePath={SELF_ATTENDANCE_ROUTES.list}
          fixedQuery={{ tab: "team" }}
        />
      </Suspense>
    </div>
  );
}
