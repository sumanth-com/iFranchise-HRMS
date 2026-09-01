"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  getEmployeeLeaveBalanceSnapshot,
  getEmployeeLeaveCalendarData,
  listEmployeeOptionalHolidaySelections,
  listEmployeeOwnLeaveRequests,
  listOrganizationOptionalHolidays,
} from "@/lib/leave/services/leave-queries";
import { optionalHolidaysForList } from "@/lib/leave/optional-holiday";
import type { LeaveCalendarContext } from "@/lib/leave/services/leave-calendar-engine";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type {
  LeaveCalendarEntry,
  LeaveEmployeeBalanceSnapshot,
  LeaveHolidayEntry,
  LeaveListItem,
} from "@/types/leave";

function parseCalendarMonthYear(month: number, year: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid month");
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid year");
  }
  return { month, year };
}

async function requireLeaveSelfServiceProfile() {
  return requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    PORTAL_PERMISSIONS.manager,
    PORTAL_PERMISSIONS.hr,
    PORTAL_PERMISSIONS.ceo,
    "leave.view",
  ]);
}

export async function getEmployeeLeaveCalendarAction(
  month: number,
  year: number,
): Promise<{
  leaves: LeaveCalendarEntry[];
  holidays: LeaveHolidayEntry[];
  calendar: LeaveCalendarContext;
}> {
  const profile = await requireLeaveSelfServiceProfile();
  const parsed = parseCalendarMonthYear(month, year);
  const supabase = await createClient();
  return getEmployeeLeaveCalendarData(supabase, profile, parsed.month, parsed.year);
}

export async function getEmployeeLeaveAnnualBalancesAction(
  calendarYear: number,
): Promise<LeaveEmployeeBalanceSnapshot[]> {
  const profile = await requireLeaveSelfServiceProfile();
  parseCalendarMonthYear(1, calendarYear);
  const supabase = await createClient();
  return getEmployeeLeaveBalanceSnapshot(
    supabase,
    profile.employee.id,
    calendarYear,
  );
}

export async function getEmployeeLeaveSelfServiceMonthAction(
  month: number,
  year: number,
): Promise<{
  leaves: LeaveCalendarEntry[];
  holidays: LeaveHolidayEntry[];
  calendar: LeaveCalendarContext;
  requests: LeaveListItem[];
}> {
  const profile = await requireLeaveSelfServiceProfile();
  const parsed = parseCalendarMonthYear(month, year);
  const supabase = await createClient();
  const employeeId = profile.employee.id;

  const [calendar, requests] = await Promise.all([
    getEmployeeLeaveCalendarData(supabase, profile, parsed.month, parsed.year),
    listEmployeeOwnLeaveRequests(supabase, employeeId, 1, 50, parsed),
  ]);

  return {
    leaves: calendar.leaves,
    holidays: calendar.holidays,
    calendar: calendar.calendar,
    requests,
  };
}

export async function getEmployeeOptionalHolidayChoicesAction(year: number) {
  const profile = await requireLeaveSelfServiceProfile();
  parseCalendarMonthYear(1, year);
  const supabase = await createClient();
  const [holidays, taken] = await Promise.all([
    listOrganizationOptionalHolidays(supabase, profile.employee.organizationId, year),
    listEmployeeOptionalHolidaySelections(supabase, profile.employee.id, year),
  ]);
  return optionalHolidaysForList(holidays, taken);
}
