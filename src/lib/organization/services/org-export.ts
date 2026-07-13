import type { ReportColumn, ReportResult, ReportKey } from "@/types/reports";
import type {
  BranchListItem,
  DepartmentListItem,
  DesignationListItem,
  EmploymentTypeListItem,
  HolidayListItem,
  ShiftTemplateListItem,
  WorkLocationListItem,
} from "@/types/organization";
import { reportToCsv, reportToExcelXml, toCell } from "@/lib/reports/services/reports-utils";
import type { OrgExportFormat } from "@/types/organization";

function mapRows(
  items: Record<string, unknown>[],
  columns: ReportColumn[],
): ReportResult["rows"] {
  return items.map((item) => {
    const row: ReportResult["rows"][number] = {};
    for (const col of columns) {
      row[col.key] = toCell(item[col.key]);
    }
    return row;
  });
}

function buildResult(
  key: ReportKey,
  title: string,
  columns: ReportColumn[],
  items: Record<string, unknown>[],
): ReportResult {
  const rows = mapRows(items, columns);
  return {
    key,
    title,
    columns,
    rows,
    total: rows.length,
    generatedAt: new Date().toISOString(),
  };
}

export function exportBranches(items: BranchListItem[], format: OrgExportFormat) {
  const columns = [
    { key: "code", header: "Code" },
    { key: "name", header: "Name" },
    { key: "location", header: "Location" },
    { key: "city", header: "City" },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
    { key: "branchHeadName", header: "Branch Head" },
    { key: "status", header: "Status" },
  ];
  const result = buildResult("hr_department", "Branches", columns, items as Record<string, unknown>[]);
  return format === "excel" ? reportToExcelXml(result) : reportToCsv(result);
}

export function exportDepartments(items: DepartmentListItem[], format: OrgExportFormat) {
  const columns = [
    { key: "code", header: "Code" },
    { key: "name", header: "Name" },
    { key: "parentDepartmentName", header: "Parent Department" },
    { key: "departmentHeadName", header: "Department Head" },
    { key: "employeeCount", header: "Employees" },
    { key: "status", header: "Status" },
  ];
  const result = buildResult("hr_department", "Departments", columns, items as Record<string, unknown>[]);
  return format === "excel" ? reportToExcelXml(result) : reportToCsv(result);
}

export function exportDesignations(items: DesignationListItem[], format: OrgExportFormat) {
  const columns = [
    { key: "code", header: "Code" },
    { key: "title", header: "Designation" },
    { key: "departmentName", header: "Department" },
    { key: "level", header: "Job Level" },
    { key: "employeeCount", header: "Employees" },
    { key: "status", header: "Status" },
  ];
  const result = buildResult("hr_designation", "Designations", columns, items as Record<string, unknown>[]);
  return format === "excel" ? reportToExcelXml(result) : reportToCsv(result);
}

export function exportEmploymentTypes(items: EmploymentTypeListItem[], format: OrgExportFormat) {
  const columns = [
    { key: "code", header: "Code" },
    { key: "name", header: "Name" },
    { key: "isFullTime", header: "Full Time" },
    { key: "defaultHoursPerWeek", header: "Hours/Week" },
    { key: "status", header: "Status" },
  ];
  const result = buildResult("hr_employee_master", "Employment Types", columns, items as Record<string, unknown>[]);
  return format === "excel" ? reportToExcelXml(result) : reportToCsv(result);
}

export function exportWorkLocations(items: WorkLocationListItem[], format: OrgExportFormat) {
  const columns = [
    { key: "name", header: "Location" },
    { key: "branchName", header: "Branch" },
    { key: "officeStartTime", header: "Start Time" },
    { key: "officeEndTime", header: "End Time" },
    { key: "latitude", header: "Latitude" },
    { key: "longitude", header: "Longitude" },
    { key: "status", header: "Status" },
  ];
  const mapped = items.map((i) => ({ ...i, workingDays: i.workingDays.join(", ") }));
  const result = buildResult("hr_department", "Work Locations", columns, mapped as Record<string, unknown>[]);
  return format === "excel" ? reportToExcelXml(result) : reportToCsv(result);
}

export function exportHolidays(items: HolidayListItem[], format: OrgExportFormat) {
  const columns = [
    { key: "name", header: "Name" },
    { key: "holidayDate", header: "Date" },
    { key: "holidayType", header: "Type" },
    { key: "branchName", header: "Branch" },
    { key: "isOptional", header: "Optional" },
    { key: "isRecurring", header: "Recurring" },
  ];
  const result = buildResult("attendance_holiday", "Holidays", columns, items as Record<string, unknown>[]);
  return format === "excel" ? reportToExcelXml(result) : reportToCsv(result);
}

export function exportShiftTemplates(items: ShiftTemplateListItem[], format: OrgExportFormat) {
  const columns = [
    { key: "name", header: "Shift" },
    { key: "startTime", header: "Start" },
    { key: "endTime", header: "End" },
    { key: "breakDurationMinutes", header: "Break (mins)" },
    { key: "graceTimeMinutes", header: "Grace (mins)" },
    { key: "minimumHours", header: "Min Hours" },
    { key: "halfDayHours", header: "Half Day Hours" },
    { key: "status", header: "Status" },
  ];
  const result = buildResult("attendance_daily", "Shift Templates", columns, items as Record<string, unknown>[]);
  return format === "excel" ? reportToExcelXml(result) : reportToCsv(result);
}
