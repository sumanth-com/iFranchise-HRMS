import { Suspense } from "react";
import { CalendarDays } from "lucide-react";

import { AttendanceSummaryCards } from "@/components/attendance/attendance-summary-cards";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { createClient } from "@/lib/supabase/server";
import {
  getAttendanceLookups,
  getAttendanceSummary,
  listAttendance,
} from "@/lib/attendance/services/attendance-queries";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { attendanceListParamsSchema } from "@/lib/validations/attendance";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";

type AttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const profile = await requireServerPermission("attendance.view");
  const supabase = await createClient();
  const rawParams = await searchParams;
  const today = getTodayDateString();

  const params = attendanceListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    search: typeof rawParams.search === "string" ? rawParams.search : undefined,
    sortBy: rawParams.sortBy,
    sortOrder: rawParams.sortOrder,
    dateFrom:
      typeof rawParams.dateFrom === "string" && rawParams.dateFrom.length > 0
        ? rawParams.dateFrom
        : undefined,
    dateTo:
      typeof rawParams.dateTo === "string" && rawParams.dateTo.length > 0
        ? rawParams.dateTo
        : undefined,
    branchId: rawParams.branchId,
    departmentId: rawParams.departmentId,
    attendanceStatus: rawParams.attendanceStatus,
    employeeId: rawParams.employeeId,
  });

  const [result, lookups, summary] = await Promise.all([
    listAttendance(supabase, profile, params),
    getAttendanceLookups(supabase, profile.employee.organizationId),
    getAttendanceSummary(supabase, profile, params.dateFrom, params.dateTo),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays className="size-4 shrink-0" />
            Summary for {summary.date}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage daily attendance records, manual entries, and workforce presence.
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
          records={result.data}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          search={params.search ?? ""}
          dateFrom={params.dateFrom}
          dateTo={params.dateTo}
          today={today}
          departmentId={params.departmentId}
          attendanceStatus={params.attendanceStatus}
          employeeId={params.employeeId}
          departments={lookups.departments}
          employees={lookups.employees}
          canCreate={hasPermission(profile.permissionCodes, "attendance.create")}
          canEdit={hasPermission(profile.permissionCodes, "attendance.edit")}
          canDelete={hasPermission(profile.permissionCodes, "attendance.delete")}
        />
      </Suspense>
    </div>
  );
}
