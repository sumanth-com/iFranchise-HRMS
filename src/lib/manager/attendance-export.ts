import {
  reportToCsv,
  reportToExcelXml,
  reportToPdfBytes,
} from "@/lib/reports/services/reports-utils";
import type { ReportExportFormat } from "@/types/reports";
import type { TeamMonthlyAttendanceRow } from "@/types/manager-attendance";

const MONTHLY_COLUMNS = [
  { key: "employeeName", header: "Employee" },
  { key: "employeeCode", header: "Employee ID" },
  { key: "departmentName", header: "Department" },
  { key: "presentDays", header: "Present Days" },
  { key: "leaveDays", header: "Leave Days" },
  { key: "absentDays", header: "Absent Days" },
  { key: "wfhDays", header: "WFH Days" },
  { key: "lateDays", header: "Late Days" },
  { key: "averageWorkingHours", header: "Avg Working Hours" },
] as const;

function buildMonthlyReportResult(rows: TeamMonthlyAttendanceRow[], monthLabel: string) {
  return {
    key: "attendance_monthly" as const,
    title: `Team Attendance Summary — ${monthLabel}`,
    generatedAt: new Date().toISOString(),
    columns: [...MONTHLY_COLUMNS],
    rows: rows.map((row) => ({
      employeeName: row.employeeName,
      employeeCode: row.employeeCode,
      departmentName: row.departmentName ?? "",
      presentDays: row.presentDays,
      leaveDays: row.leaveDays,
      absentDays: row.absentDays,
      wfhDays: row.wfhDays,
      lateDays: row.lateDays,
      averageWorkingHours:
        row.averageWorkingHours > 0 ? row.averageWorkingHours.toFixed(1) : "—",
    })),
    total: rows.length,
  };
}

function slugifyMonth(monthLabel: string) {
  return monthLabel.toLowerCase().replace(/\s+/g, "-");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportTeamMonthlyAttendance(
  rows: TeamMonthlyAttendanceRow[],
  monthLabel: string,
  format: ReportExportFormat,
) {
  const result = buildMonthlyReportResult(rows, monthLabel);
  const slug = slugifyMonth(monthLabel);

  if (format === "csv") {
    const content = reportToCsv(result);
    downloadBlob(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
      `team-attendance-${slug}.csv`,
    );
    return;
  }

  if (format === "excel") {
    const content = reportToExcelXml(result);
    downloadBlob(
      new Blob([content], { type: "application/vnd.ms-excel" }),
      `team-attendance-${slug}.xls`,
    );
    return;
  }

  const bytes = await reportToPdfBytes(result);
  downloadBlob(
    new Blob([Uint8Array.from(bytes)], { type: "application/pdf" }),
    `team-attendance-${slug}.pdf`,
  );
}
