import { isUnapprovedQualifyingLateEntry } from "@/lib/attendance/services/attendance-utils";
import {
  renderBrandedEmail,
  renderDetailTable,
  renderParagraph,
} from "@/lib/email/branding";

export type LateWarningLabel = "1/3" | "2/3" | "3/3";

export type LateWarningCycle = {
  label: LateWarningLabel;
  reachedHalfDayLop: boolean;
};

/**
 * Position of this qualifying late inside the repeating group of three.
 * The 3rd, 6th, and 9th each reach the half-day LOP threshold once.
 */
export function lateWarningCycle(qualifyingLateCount: number): LateWarningCycle | null {
  if (!Number.isFinite(qualifyingLateCount) || qualifyingLateCount < 1) return null;
  const slot = ((Math.floor(qualifyingLateCount) - 1) % 3) + 1;
  const label = `${slot}/3` as LateWarningLabel;
  return { label, reachedHalfDayLop: slot === 3 };
}

/** Same late-day rules payroll uses. On-time and early-checkout Absent do not count. */
export function isQualifyingLateAttendance(
  status: string | null | undefined,
  notes?: string | null,
): boolean {
  return isUnapprovedQualifyingLateEntry(status, notes);
}

export function lateWarningEventKey(employeeId: string, attendanceDate: string): string {
  return `late_warning:${employeeId}:${attendanceDate}`;
}

export function attendanceMonthBounds(attendanceDate: string): { from: string; to: string } {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(attendanceDate);
  if (!match) {
    throw new Error("Attendance date must be yyyy-MM-dd.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${match[1]}-${match[2]}-01`,
    to: `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildLateCheckInWarningEmail(input: {
  employeeName: string;
  attendanceDateLabel: string;
  checkInTimeLabel: string;
  cycle: LateWarningCycle;
}): { subject: string; html: string; text: string } {
  const name = input.employeeName.trim() || "Employee";
  const { label, reachedHalfDayLop } = input.cycle;
  const policy =
    "Company policy: three qualifying late check-ins in an attendance period result in a half-day loss of pay.";
  const threshold = reachedHalfDayLop
    ? `This is late check-in ${label}. The third qualifying late entry in this period has reached the half-day loss of pay threshold.`
    : `This is late check-in ${label}. A half-day loss of pay applies when the count reaches 3/3.`;

  const subject = `Late check-in warning (${label})`;
  const text = [
    `Dear ${name},`,
    "",
    "This note records a qualifying late check-in.",
    "",
    `Employee: ${name}`,
    `Late check-in date: ${input.attendanceDateLabel}`,
    `Check-in time: ${input.checkInTimeLabel}`,
    `Current late count: ${label}`,
    "",
    policy,
    threshold,
  ].join("\n");

  const contentHtml = [
    renderParagraph(`Dear ${escapeHtml(name)},`),
    renderParagraph("This note records a qualifying late check-in."),
    renderDetailTable([
      { label: "Employee", value: escapeHtml(name) },
      { label: "Late check-in date", value: escapeHtml(input.attendanceDateLabel) },
      { label: "Check-in time", value: escapeHtml(input.checkInTimeLabel) },
      { label: "Current late count", value: escapeHtml(label) },
    ]),
    renderParagraph(escapeHtml(policy)),
    renderParagraph(escapeHtml(threshold)),
  ].join("");

  const html = renderBrandedEmail({
    title: subject,
    preheader: `${name} checked in late. Current late count ${label}.`,
    heading: "Late check-in warning",
    contentHtml,
    footerNote: "iFranchise HRMS · Attendance policy notice",
  });

  return { subject, html, text };
}
