"use server";

import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import {
  getAttendanceLookups,
  getAttendanceSummary,
  listAttendance,
} from "@/lib/attendance/services/attendance-queries";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  getCeoAttendanceAnalytics,
  getCeoAttendanceCalendar,
  getCeoAttendanceEmployeeDetail,
  getCeoAttendanceExceptions,
  getCeoAttendanceKpis,
  getCeoAttendanceOverview,
  getCeoAttendancePageData,
  listCeoAttendanceDepartments,
  listCeoAttendanceEmployees,
} from "@/lib/ceo/services/ceo-attendance-queries";
import { requireCeoPortal, toViewOnlyProfile } from "@/lib/ceo/read-only-permissions";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { attendanceListParamsSchema } from "@/lib/validations/attendance";
import type { AttendanceListParams } from "@/types/attendance";
import {
  ceoAttendanceEmployeeIdSchema,
  ceoAttendanceListParamsSchema,
} from "@/lib/validations/ceo-attendance";
import type {
  CeoAttendanceAnalytics,
  CeoAttendanceCalendarItem,
  CeoAttendanceDepartmentRow,
  CeoAttendanceEmployeeDetail,
  CeoAttendanceEmployeeListResult,
  CeoAttendanceExceptions,
  CeoAttendanceKpis,
  CeoAttendanceListParams,
  CeoAttendanceOverview,
  CeoAttendancePageData,
} from "@/types/ceo-attendance";

export async function getCeoAttendanceModuleData(
  params: CeoAttendanceListParams,
): Promise<CeoAttendancePageData> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoAttendancePageData(
    supabase,
    profile,
    ceoAttendanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoAttendanceKpisAction(
  params: CeoAttendanceListParams,
): Promise<CeoAttendanceKpis> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoAttendanceKpis(
    supabase,
    profile,
    ceoAttendanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoAttendanceOverviewAction(
  params: CeoAttendanceListParams,
): Promise<CeoAttendanceOverview> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoAttendanceOverview(
    supabase,
    profile,
    ceoAttendanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoAttendanceDepartmentsAction(
  params: CeoAttendanceListParams,
): Promise<CeoAttendanceDepartmentRow[]> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return listCeoAttendanceDepartments(
    supabase,
    profile,
    ceoAttendanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoAttendanceEmployeesAction(
  params: CeoAttendanceListParams,
): Promise<CeoAttendanceEmployeeListResult> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return listCeoAttendanceEmployees(
    supabase,
    profile,
    ceoAttendanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoAttendanceAnalyticsAction(
  params: CeoAttendanceListParams,
): Promise<CeoAttendanceAnalytics> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoAttendanceAnalytics(
    supabase,
    profile,
    ceoAttendanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoAttendanceExceptionsAction(
  params: CeoAttendanceListParams,
): Promise<CeoAttendanceExceptions> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoAttendanceExceptions(
    supabase,
    profile,
    ceoAttendanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoAttendanceCalendarAction(
  params: CeoAttendanceListParams,
): Promise<CeoAttendanceCalendarItem[]> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoAttendanceCalendar(
    supabase,
    profile,
    ceoAttendanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoAttendanceEmployeeDetailAction(input: {
  employeeId: string;
  month?: number;
  year?: number;
}): Promise<
  | { success: true; data: CeoAttendanceEmployeeDetail }
  | { success: false; message: string }
> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoAttendanceEmployeeIdSchema.parse(input);
    const data = await getCeoAttendanceEmployeeDetail(supabase, profile, parsed);
    if (!data) return { success: false, message: "Employee not found." };
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load employee attendance profile.",
    };
  }
}

export async function getCeoTeamAttendancePageData(params: AttendanceListParams) {
  const profile = await requireCeoPortal();
  const supabase = await createClient();
  const viewProfile = toViewOnlyProfile(profile);
  const parsed = attendanceListParamsSchema.parse(params);
  const [records, lookups, summary] = await Promise.all([
    listAttendance(supabase, viewProfile, parsed),
    getAttendanceLookups(supabase, viewProfile.employee.organizationId),
    getAttendanceSummary(supabase, viewProfile, parsed.dateFrom, parsed.dateTo, {
      departmentId: parsed.departmentId,
      branchId: parsed.branchId,
      employeeId: parsed.employeeId,
    }),
  ]);

  return {
    records,
    lookups,
    summary,
    today: getTodayDateString(),
    params: parsed,
  };
}
