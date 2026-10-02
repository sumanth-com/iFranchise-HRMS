import "server-only";

import { after } from "next/server";

import {
  attendanceMonthBounds,
  buildLateCheckInWarningEmail,
  isQualifyingLateAttendance,
  lateWarningCycle,
  lateWarningEventKey,
} from "@/lib/attendance/late-warning";
import { PAYROLL_BUSINESS_TIMEZONE } from "@/lib/payroll/services/payslip-publication";
import { sendEmail } from "@/lib/email/mailer";
import { createAdminClient } from "@/lib/supabase/admin";

const LATE_WARNING_TIME_ZONE = PAYROLL_BUSINESS_TIMEZONE;

export type LateCheckInWarningJob = {
  organizationId: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  attendanceDate: string;
  checkInAt: string;
};

function formatWarningDate(attendanceDate: string): string {
  const parsed = new Date(`${attendanceDate}T12:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: LATE_WARNING_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatWarningTime(checkInAt: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: LATE_WARNING_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(checkInAt));
}

async function countQualifyingLatesInPeriod(
  employeeId: string,
  attendanceDate: string,
): Promise<number> {
  const { from, to } = attendanceMonthBounds(attendanceDate);
  const { data, error } = await createAdminClient()
    .schema("hrms")
    .from("attendance")
    .select("attendance_status, notes")
    .eq("employee_id", employeeId)
    .gte("attendance_date", from)
    .lte("attendance_date", to)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  return (data ?? []).filter((row) =>
    isQualifyingLateAttendance(
      (row as { attendance_status?: string | null }).attendance_status,
      (row as { notes?: string | null }).notes,
    ),
  ).length;
}

async function claimLateWarning(input: LateCheckInWarningJob, message: string): Promise<boolean> {
  const { error } = await createAdminClient()
    .schema("hrms")
    .from("notifications")
    .insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      employee_id: input.employeeId,
      title: "Late check-in warning",
      message,
      notification_type: "attendance",
      notification_status: "unread",
      module: "attendance",
      priority: "medium",
      source_event_key: lateWarningEventKey(input.employeeId, input.attendanceDate),
      metadata: { attendanceDate: input.attendanceDate, checkInAt: input.checkInAt },
      status: "active",
      created_by: input.userId,
      updated_by: input.userId,
    });

  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(error.message);
}

/** Sends one warning for this employee and date. Failures are logged by the caller. */
export async function deliverLateCheckInWarning(input: LateCheckInWarningJob): Promise<void> {
  const email = input.employeeEmail.trim();
  if (!email) return;

  const lateCount = await countQualifyingLatesInPeriod(input.employeeId, input.attendanceDate);
  const cycle = lateWarningCycle(lateCount);
  if (!cycle) return;

  const content = buildLateCheckInWarningEmail({
    employeeName: input.employeeName,
    attendanceDateLabel: formatWarningDate(input.attendanceDate),
    checkInTimeLabel: formatWarningTime(input.checkInAt),
    cycle,
  });

  const claimed = await claimLateWarning(input, content.text);
  if (!claimed) return;

  await sendEmail({
    to: email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

/** Runs after the check-in response. Email errors never reject the punch. */
export function scheduleLateCheckInWarning(input: LateCheckInWarningJob): void {
  try {
    after(() => {
      void deliverLateCheckInWarning(input).catch((error) => {
        console.error("[late-check-in-warning]", error);
      });
    });
  } catch (error) {
    console.error("[late-check-in-warning] schedule failed", error);
  }
}
