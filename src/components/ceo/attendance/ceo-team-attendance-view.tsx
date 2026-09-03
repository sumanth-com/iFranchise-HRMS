"use client";

import { useState } from "react";

import { HrTeamAttendanceView } from "@/components/attendance/hr-team-attendance-view";
import { CeoAttendanceRecordDrawer } from "@/components/ceo/attendance/ceo-attendance-record-drawer";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import type { AttendanceListItem, AttendanceLookups, AttendanceSummary, AttendanceHistoryCounts } from "@/types/attendance";
import type { LookupOption } from "@/types/employee";

type CeoTeamAttendanceViewProps = {
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
  historyCounts?: AttendanceHistoryCounts;
};

export function CeoTeamAttendanceView({
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
  historyCounts,
}: CeoTeamAttendanceViewProps) {
  const [viewAttendanceId, setViewAttendanceId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  return (
    <>
      <HrTeamAttendanceView
        summary={summary}
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
        canCreate={false}
        canEdit={false}
        canDelete={false}
        listBasePath={CEO_ROUTES.attendance}
        title="Attendance"
        description="Monitor company-wide attendance records and workforce presence. This page is read-only."
        historyCounts={historyCounts}
        onViewRecord={(row) => {
          setViewAttendanceId(row.id);
          setViewOpen(true);
        }}
      />
      <CeoAttendanceRecordDrawer
        attendanceId={viewAttendanceId}
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setViewAttendanceId(null);
        }}
      />
    </>
  );
}
