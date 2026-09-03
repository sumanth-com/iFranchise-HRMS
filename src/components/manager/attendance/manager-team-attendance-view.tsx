"use client";

import { useState } from "react";

import { HrTeamAttendanceView } from "@/components/attendance/hr-team-attendance-view";
import { ManagerAttendanceDetailDrawer } from "@/components/manager/attendance/manager-attendance-detail-drawer";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import type { AttendanceListItem, AttendanceSummary } from "@/types/attendance";
import type { LookupOption } from "@/types/employee";
import type {
  TeamAttendanceListItem,
  TeamAttendanceSummary,
} from "@/types/manager-attendance";

function toAttendanceListItem(row: TeamAttendanceListItem): AttendanceListItem {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeCode: row.employeeCode,
    employeeName: row.employeeName,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    designationId: row.designationId,
    designationTitle: row.designationTitle,
    branchId: row.branchId,
    branchName: row.branchName,
    attendanceDate: row.attendanceDate,
    checkInAt: row.checkInAt,
    checkOutAt: row.checkOutAt,
    workHours: row.workHours,
    overtimeHours: row.overtimeHours,
    attendanceStatus: row.attendanceStatus,
    correctionId: row.correctionId,
    correctionStatus: row.correctionStatus,
  };
}

function toAttendanceSummary(
  summary: TeamAttendanceSummary,
  teamSize: number,
): AttendanceSummary {
  return {
    date: summary.dateLabel,
    presentToday: summary.presentToday + summary.halfDayToday,
    absentToday: summary.absentToday,
    lateToday: summary.lateToday,
    halfDayToday: 0,
    onLeaveToday: 0,
    totalEmployees: teamSize,
  };
}

type ManagerTeamAttendanceViewProps = {
  summary: TeamAttendanceSummary;
  records: TeamAttendanceListItem[];
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
};

export function ManagerTeamAttendanceView({
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
}: ManagerTeamAttendanceViewProps) {
  const [viewAttendanceId, setViewAttendanceId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  return (
    <>
      <HrTeamAttendanceView
        summary={toAttendanceSummary(summary, employees.length)}
        records={records.map(toAttendanceListItem)}
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
        canCreate={false}
        canEdit={false}
        canDelete={false}
        listBasePath={MANAGER_ROUTES.attendanceTeam}
        title="Team Attendance"
        description="View daily attendance for people in your reporting hierarchy. This page is read-only."
        onViewRecord={(row) => {
          setViewAttendanceId(row.id);
          setViewOpen(true);
        }}
      />
      <ManagerAttendanceDetailDrawer
        attendanceId={viewAttendanceId}
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setViewAttendanceId(null);
        }}
        readOnly
      />
    </>
  );
}
