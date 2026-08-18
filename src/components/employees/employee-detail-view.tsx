"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, CheckCircle2, Clock3, FileStack, Hourglass, Pencil, Wallet } from "lucide-react";

import { EmployeeIdCard } from "@/components/employees/employee-id-card";
import {
  EmployeeAccountStatusBadge,
  getEmployeeLoginStatus,
} from "@/components/employees/employee-account-status-badge";
import { EmployeeEditForm } from "@/components/employees/employee-edit-form";
import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import { buttonVariants } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { FilterSelect } from "@/components/common/filter-select";
import { DocumentsExplorer } from "@/components/employee/documents/documents-explorer";
import { EmployeeAssetsView } from "@/components/employee/assets/employee-assets-view";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { EmployeeDetailPayrollSection } from "@/components/employees/employee-detail-payroll-section";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/attendance/constants";
import { EMPLOYEE_ACCOUNT_STATUS_LABELS, type EmployeeTab } from "@/lib/employees/constants";
import { getMonthSelectItems, getYearSelectItems } from "@/components/payroll/select-utils";
import { buildEmployeeRouteRef } from "@/lib/employees/routing";
import type {
  EmployeeAttendancePeriod,
  EmployeeAttendanceSummary,
  EmployeeBankAccountDetail,
  EmployeeDetail,
  EmployeeLeaveApprovalDetail,
  EmployeeLeaveBalanceDetail,
  EmployeeLeaveRequestDetail,
  EmployeeSalaryStructureDetail,
  LookupOption,
} from "@/types/employee";
import type { AssetAssignmentItem } from "@/types/assets";
import type { EmployeeDocumentsExplorerData } from "@/types/employee-documents-explorer";
import type { EmployeeAssetsData } from "@/types/employee-assets";
import type { EmployeePayrollData } from "@/types/employee-payroll";
import { cn } from "@/lib/utils";
import type { LeaveStatus } from "@/types/leave";
import { hasPermission } from "@/lib/permissions/utils";

type EmployeeDetailViewProps = {
  employee: EmployeeDetail;
  profileImageUrl: string | null;
  attendance: Array<Record<string, unknown>>;
  leaveRequests: EmployeeLeaveRequestDetail[];
  leaveApprovals: EmployeeLeaveApprovalDetail[];
  payrollItems: Array<Record<string, unknown>>;
  bankAccounts: EmployeeBankAccountDetail[];
  leaveBalances: EmployeeLeaveBalanceDetail[];
  salaryStructure: EmployeeSalaryStructureDetail | null;
  attendanceSummary: EmployeeAttendanceSummary;
  attendancePeriod: EmployeeAttendancePeriod;
  assets: AssetAssignmentItem[];
  documentsExplorer: EmployeeDocumentsExplorerData;
  assetsData: EmployeeAssetsData;
  payrollData: EmployeePayrollData | null;
  permissionCodes: string[];
  lookups: {
    branches: LookupOption[];
    departments: LookupOption[];
    designations: LookupOption[];
    employmentTypes: LookupOption[];
    managers: LookupOption[];
  };
  isEditing?: boolean;
  onToggleEdit?: () => void;
  onCancelEdit?: () => void;
  onSavedEdit?: () => void;
  routesBasePath?: string;
  activeTab: EmployeeTab;
};

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM d, yyyy");
}

function formatIndianPhone(phone: string | null | undefined): string {
  if (!phone?.trim()) return "—";

  const trimmed = phone.trim();
  if (trimmed.includes("+")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "—";

  let localNumber = digits;
  if (digits.startsWith("91") && digits.length >= 12) {
    localNumber = digits.slice(-10);
  } else if (digits.length > 10) {
    localNumber = digits.slice(-10);
  }

  if (localNumber.length !== 10) {
    return trimmed;
  }

  return `(+91) ${localNumber.slice(0, 4)} ${localNumber.slice(4, 7)} ${localNumber.slice(7)}`;
}

function formatDisplayLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "—";

  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function displayOrDash(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  return value.trim();
}

function TabEditButton({
  label,
  href,
  onClick,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const className = cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0");

  if (href) {
    return (
      <Link href={href} className={className}>
        <Pencil className="size-3.5" />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      <Pencil className="size-3.5" />
      {label}
    </button>
  );
}

function OverviewSectionTitle({ children }: { children: string }) {
  return (
    <p className="bg-black px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_1px_0_rgba(255,255,255,0.08)]">
      {children}
    </p>
  );
}
function OverviewDetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(9rem,11rem)_1fr] items-center gap-x-8 border-b border-border/50 px-5 py-3.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-sm font-medium text-foreground">
        <div className="flex flex-wrap justify-end gap-2">{children}</div>
      </div>
    </div>
  );
}

function OverviewInfoRow({
  label,
  value,
  href,
  valueClassName,
}: {
  label: string;
  value: string;
  href?: string;
  valueClassName?: string;
}) {
  return (
    <OverviewDetailRow label={label}>
      {href ? (
        <a
          href={href}
          className={cn("inline-block text-primary hover:underline", valueClassName)}
        >
          {value}
        </a>
      ) : (
        <span className={cn("inline-block whitespace-normal break-words text-right", valueClassName)}>
          {value}
        </span>
      )}
    </OverviewDetailRow>
  );
}

export function EmployeeDetailView({
  employee,
  profileImageUrl,
  attendance,
  leaveRequests,
  leaveApprovals,
  payrollItems: _payrollItems,
  bankAccounts: _bankAccounts,
  leaveBalances,
  salaryStructure,
  attendanceSummary,
  attendancePeriod,
  assets,
  documentsExplorer,
  assetsData,
  payrollData,
  permissionCodes,
  lookups,
  isEditing = false,
  onToggleEdit,
  onCancelEdit,
  onSavedEdit,
  routesBasePath,
  activeTab,
}: EmployeeDetailViewProps) {
  const canEditEmployee = hasPermission(permissionCodes, "employee.edit");
  const canEditProfile = hasPermission(permissionCodes, "employee_profile.edit");
  const statutory = salaryStructure?.components ?? {};
  const employeeFullName = `${employee.firstName} ${employee.lastName}`.trim();
  const accountStatusLabel =
    EMPLOYEE_ACCOUNT_STATUS_LABELS[employee.accountStatus] ?? employee.accountStatus;
  const loginStatusLabel = getEmployeeLoginStatus(employee.accountStatus);
  const probationEnd =
    typeof statutory.probation_end_date === "string"
      ? statutory.probation_end_date
      : null;
  const primaryEmergencyContact =
    employee.emergencyContacts.find((contact) => contact.isPrimary) ??
    employee.emergencyContacts[0];
  const emergencyContactName = primaryEmergencyContact?.name ?? "—";
  const emergencyContactRelationship = primaryEmergencyContact?.relationship
    ? formatDisplayLabel(primaryEmergencyContact.relationship)
    : "—";
  const emergencyContactPhone = formatIndianPhone(primaryEmergencyContact?.phone);
  const employeePhone = formatIndianPhone(employee.phone);
  const primaryAddress =
    employee.addresses.find((item) => item.isPrimary) ?? employee.addresses[0];
  const emergencyContactEmail = primaryEmergencyContact?.email
    ? primaryEmergencyContact.email
    : "—";

  return (
    <div className="space-y-0">
      <div>
      {activeTab === "overview" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,22rem)] lg:items-start">
          <section className="flex flex-col space-y-3">
            <h2 className="text-base font-semibold">Employee Information</h2>
            {isEditing && canEditEmployee ? (
              <div className="rounded-xl border bg-card p-4 md:p-5">
                <EmployeeEditForm
                  employee={employee}
                  lookups={lookups}
                  variant="inline"
                  onCancel={onCancelEdit}
                  onSaved={onSavedEdit}
                  routesBasePath={routesBasePath}
                />
              </div>
            ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <OverviewSectionTitle>Employment & contact</OverviewSectionTitle>
              <OverviewInfoRow label="Employee code" value={employee.employeeCode} />
              <OverviewInfoRow
                label="Company email"
                value={employee.email}
                href={`mailto:${employee.email}`}
              />
              <OverviewInfoRow label="Employee name" value={employeeFullName} />
              <OverviewInfoRow
                label="Phone"
                value={employeePhone}
                valueClassName="tabular-nums tracking-wide"
              />
              <OverviewInfoRow label="Branch" value={employee.branchName ?? "—"} />
              <OverviewInfoRow label="Department" value={employee.departmentName ?? "—"} />
              <OverviewInfoRow label="Designation" value={employee.designationTitle ?? "—"} />
              <OverviewInfoRow
                label="Employment type"
                value={formatDisplayLabel(employee.employmentTypeName)}
              />
              <OverviewInfoRow
                label="Reporting manager"
                value={employee.reportingManagerName ?? "—"}
              />
              <OverviewDetailRow label="Employment status">
                <EmploymentStatusBadge status={employee.employmentStatus} />
              </OverviewDetailRow>
              <OverviewInfoRow
                label="Date of joining"
                value={formatDisplayDate(employee.dateOfJoining)}
              />
              <OverviewInfoRow
                label="Date of leaving"
                value={formatDisplayDate(employee.dateOfLeaving)}
              />
              <OverviewInfoRow
                label="Account status"
                value={`${accountStatusLabel} · ${loginStatusLabel}`}
              />
              <OverviewInfoRow
                label="Probation ends"
                value={formatDisplayDate(probationEnd)}
              />

              <OverviewSectionTitle>Address</OverviewSectionTitle>
              <OverviewInfoRow
                label="Address line 1"
                value={displayOrDash(primaryAddress?.addressLine1)}
              />
              <OverviewInfoRow
                label="Address line 2"
                value={displayOrDash(primaryAddress?.addressLine2)}
              />
              <OverviewInfoRow label="City" value={displayOrDash(primaryAddress?.city)} />
              <OverviewInfoRow label="State" value={displayOrDash(primaryAddress?.state)} />
              <OverviewInfoRow
                label="Postal code"
                value={displayOrDash(primaryAddress?.postalCode)}
              />
              <OverviewInfoRow label="Country" value={displayOrDash(primaryAddress?.country)} />

              <OverviewSectionTitle>Emergency contact</OverviewSectionTitle>
              <OverviewInfoRow label="Contact name" value={emergencyContactName} />
              <OverviewInfoRow
                label="Relationship"
                value={emergencyContactRelationship}
              />
              <OverviewInfoRow
                label="Phone"
                value={emergencyContactPhone}
                valueClassName="tabular-nums tracking-wide"
              />
              <OverviewInfoRow
                label="Email"
                value={emergencyContactEmail}
                href={
                  emergencyContactEmail !== "—"
                    ? `mailto:${emergencyContactEmail}`
                    : undefined
                }
              />

              <OverviewSectionTitle>Profile details</OverviewSectionTitle>
              <OverviewInfoRow
                label="Date of birth"
                value={formatDisplayDate(employee.profile?.dateOfBirth)}
              />
              <OverviewInfoRow
                label="Gender"
                value={formatDisplayLabel(employee.profile?.gender)}
              />
              <OverviewInfoRow
                label="Marital status"
                value={formatDisplayLabel(employee.profile?.maritalStatus)}
              />
              <OverviewInfoRow
                label="Nationality"
                value={displayOrDash(employee.profile?.nationality)}
              />
              <OverviewInfoRow
                label="Blood group"
                value={displayOrDash(employee.profile?.bloodGroup)}
              />
              <OverviewInfoRow
                label="Personal email"
                value={displayOrDash(employee.profile?.personalEmail)}
                href={
                  employee.profile?.personalEmail
                    ? `mailto:${employee.profile.personalEmail}`
                    : undefined
                }
              />
              <OverviewInfoRow
                label="Personal phone"
                value={formatIndianPhone(employee.profile?.personalPhone)}
                valueClassName="tabular-nums tracking-wide"
              />
              <OverviewDetailRow label="Bio">
                <span className="whitespace-pre-wrap text-left text-sm font-medium leading-relaxed">
                  {displayOrDash(employee.profile?.bio)}
                </span>
              </OverviewDetailRow>
            </div>
            )}
          </section>

          <aside className="flex flex-col items-center gap-3 overflow-visible pr-5 lg:sticky lg:top-6 lg:self-start">
            <div className="flex w-full max-w-[19rem] flex-wrap items-center justify-center gap-2">
              <EmployeeAccountStatusBadge
                status={employee.accountStatus}
                className="h-7 px-3 text-xs leading-none"
              />
              {canEditEmployee ? (
                <TabEditButton
                  label={isEditing ? "Cancel editing" : "Edit employee"}
                  onClick={onToggleEdit}
                />
              ) : null}
            </div>
            <EmployeeIdCard
              employeeId={employee.id}
              firstName={employee.firstName}
              lastName={employee.lastName}
              employeeCode={employee.employeeCode}
              designation={employee.designationTitle}
              departmentName={employee.departmentName}
              employmentTypeName={formatDisplayLabel(employee.employmentTypeName)}
              accountStatus={employee.accountStatus}
              imageUrl={profileImageUrl}
              profilePath={`/e/${buildEmployeeRouteRef(employee)}`}
              canEdit={canEditProfile}
              className="w-full"
            />
          </aside>
        </div>
      ) : null}

      {activeTab === "documents" ? (
        <DocumentsExplorer data={documentsExplorer} readOnly />
      ) : null}

      {activeTab === "assets" ? (
        <EmployeeAssetsView data={assetsData} readOnly />
      ) : null}

      {activeTab === "attendance" ? (
        <EmployeeAttendanceTab
          employee={employee}
          attendance={attendance}
          attendanceSummary={attendanceSummary}
          attendancePeriod={attendancePeriod}
          routesBasePath={routesBasePath}
        />
      ) : null}

      {activeTab === "leave" ? (
        <EmployeeLeaveTab
          employee={employee}
          leaveRequests={leaveRequests}
          leaveApprovals={leaveApprovals}
          leaveBalances={leaveBalances}
          attendancePeriod={attendancePeriod}
          routesBasePath={routesBasePath}
        />
      ) : null}

      {activeTab === "payroll" ? (
        <EmployeeDetailPayrollSection data={payrollData} />
      ) : null}
      </div>
    </div>
  );
}

function SimpleTable({
  columns,
  data,
  emptyTitle,
  emptyDescription,
  scrollable = false,
}: {
  columns: DataTableColumn<Record<string, unknown>>[];
  data: Array<Record<string, unknown>>;
  emptyTitle: string;
  emptyDescription: string;
  scrollable?: boolean;
}) {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      scrollable={scrollable}
      maxHeightClass="max-h-[min(28rem,calc(100dvh-22rem))]"
    />
  );
}

const periodMonthItems = getMonthSelectItems();

function periodYearItems(selectedYear: number | null) {
  const current = new Date().getFullYear();
  const years = new Set([
    current - 2,
    current - 1,
    current,
    current + 1,
    current + 2,
  ]);
  if (selectedYear != null) {
    years.add(selectedYear);
  }
  return getYearSelectItems([...years].sort((a, b) => a - b));
}

function PeriodMonthYearFilters({
  period,
  onPeriodChange,
}: {
  period: EmployeeAttendancePeriod;
  onPeriodChange: (next: { month: number | null; year: number | null }) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="grid h-9 grid-cols-[3rem_1fr] items-center rounded-lg border bg-muted/30 px-3">
        <span className="text-xs font-medium text-muted-foreground">Month</span>
        <FilterSelect
          items={periodMonthItems}
          value={period.month != null ? String(period.month) : ""}
          onValueChange={(value) =>
            onPeriodChange({
              month: Number.parseInt(value, 10),
              year: period.year,
            })
          }
          placeholder="Select"
          className="w-full"
          triggerClassName="h-7 w-full border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="grid h-9 grid-cols-[3rem_1fr] items-center rounded-lg border bg-muted/30 px-3">
        <span className="text-xs font-medium text-muted-foreground">Year</span>
        <FilterSelect
          items={periodYearItems(period.year)}
          value={period.year != null ? String(period.year) : ""}
          onValueChange={(value) =>
            onPeriodChange({
              month: period.month,
              year: Number.parseInt(value, 10),
            })
          }
          placeholder="Select"
          className="w-full"
          triggerClassName="h-7 w-full border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}

function PeriodEmptyPrompt({ description }: { description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border bg-card px-8 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CalendarDays className="size-6" />
      </div>
      <h3 className="mt-4 text-sm font-medium">Select a month and year</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function EmployeeAttendanceTab({
  employee,
  attendance: initialAttendance,
  attendanceSummary: initialAttendanceSummary,
  attendancePeriod,
  routesBasePath,
}: {
  employee: EmployeeDetail;
  attendance: Array<Record<string, unknown>>;
  attendanceSummary: EmployeeAttendanceSummary;
  attendancePeriod: EmployeeAttendancePeriod;
  routesBasePath?: string;
}) {
  const [period, setPeriod] = useState<EmployeeAttendancePeriod>(attendancePeriod);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [attendanceSummary, setAttendanceSummary] = useState(initialAttendanceSummary);
  const [loading, setLoading] = useState(false);

  async function handlePeriodChange(next: { month: number | null; year: number | null }) {
    setPeriod(next);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "attendance");
    if (next.month != null) params.set("month", String(next.month));
    else params.delete("month");
    if (next.year != null) params.set("year", String(next.year));
    else params.delete("year");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);

    if (next.month != null && next.year != null) {
      setLoading(true);
      try {
        const { getEmployeePeriodDataAction } = await import("@/lib/employees/actions");
        const data = await getEmployeePeriodDataAction(employee.id, next.month, next.year);
        setAttendance(data.attendance);
        setAttendanceSummary(data.attendanceSummary);
      } catch {
        // keep existing data
      } finally {
        setLoading(false);
      }
    }
  }

  const { month, year } = period;
  const hasPeriod = month != null && year != null;
  const monthLabel = hasPeriod
    ? format(new Date(year, month - 1, 1), "MMMM yyyy")
    : "";

  const avgHoursPerDay =
    hasPeriod && attendanceSummary.presentDays > 0
      ? (attendanceSummary.totalWorkHours / attendanceSummary.presentDays).toFixed(1)
      : "0";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <EmployeeStatCard
          label="Present days"
          value={String(hasPeriod ? attendanceSummary.presentDays : 0)}
          icon={CalendarDays}
          accent="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <EmployeeStatCard
          label="Absent days"
          value={String(hasPeriod ? Math.max(0, attendanceSummary.totalRecords - attendanceSummary.presentDays) : 0)}
          icon={Hourglass}
          accent="text-rose-600 dark:text-rose-400"
          iconBg="bg-rose-500/10"
        />
        <EmployeeStatCard
          label="Total work hours"
          value={String(hasPeriod ? attendanceSummary.totalWorkHours : 0)}
          icon={Clock3}
          accent="text-sky-600 dark:text-sky-400"
          iconBg="bg-sky-500/10"
        />
        <EmployeeStatCard
          label="Avg hours/day"
          value={avgHoursPerDay}
          icon={Clock3}
          accent="text-violet-600 dark:text-violet-400"
          iconBg="bg-violet-500/10"
        />
        <div className="flex items-center justify-center rounded-xl border bg-card p-3">
          <PeriodMonthYearFilters
            period={period}
            onPeriodChange={handlePeriodChange}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card px-8 py-16">
          <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : hasPeriod ? (
        <section className="overflow-hidden rounded-xl border bg-card">
          <OverviewSectionTitle>Attendance history</OverviewSectionTitle>
          <div className="p-4">
            <SimpleTable
              columns={[
                { key: "attendance_date", header: "Date" },
                {
                  key: "check_in_at",
                  header: "Check in",
                  render: (row) =>
                    row.check_in_at
                      ? format(new Date(String(row.check_in_at)), "PPp")
                      : "—",
                },
                {
                  key: "check_out_at",
                  header: "Check out",
                  render: (row) =>
                    row.check_out_at
                      ? format(new Date(String(row.check_out_at)), "PPp")
                      : "—",
                },
                {
                  key: "attendance_status",
                  header: "Status",
                  render: (row) => {
                    const status = String(row.attendance_status ?? "");
                    return (
                      ATTENDANCE_STATUS_LABELS[
                        status as keyof typeof ATTENDANCE_STATUS_LABELS
                      ] ?? status
                    );
                  },
                },
                { key: "work_hours", header: "Hours" },
              ]}
              data={attendance}
              emptyTitle={`No attendance records for ${monthLabel}`}
              emptyDescription="Try another month, or records will appear here once attendance is marked."
              scrollable
            />
          </div>
        </section>
      ) : (
        <PeriodEmptyPrompt description="Choose a period above to view this employee's attendance summary and daily history." />
      )}
    </div>
  );
}

function EmployeeLeaveTab({
  employee,
  leaveRequests: initialLeaveRequests,
  leaveApprovals: initialLeaveApprovals,
  leaveBalances: initialLeaveBalances,
  attendancePeriod,
  routesBasePath,
}: {
  employee: EmployeeDetail;
  leaveRequests: EmployeeLeaveRequestDetail[];
  leaveApprovals: EmployeeLeaveApprovalDetail[];
  leaveBalances: EmployeeLeaveBalanceDetail[];
  attendancePeriod: EmployeeAttendancePeriod;
  routesBasePath?: string;
}) {
  const [period, setPeriod] = useState<EmployeeAttendancePeriod>(attendancePeriod);
  const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests);
  const [leaveApprovals, setLeaveApprovals] = useState(initialLeaveApprovals);
  const [leaveBalances, setLeaveBalances] = useState(initialLeaveBalances);
  const [loading, setLoading] = useState(false);

  async function handlePeriodChange(next: { month: number | null; year: number | null }) {
    setPeriod(next);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "leave");
    if (next.month != null) params.set("month", String(next.month));
    else params.delete("month");
    if (next.year != null) params.set("year", String(next.year));
    else params.delete("year");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);

    if (next.month != null && next.year != null) {
      setLoading(true);
      try {
        const { getEmployeePeriodDataAction } = await import("@/lib/employees/actions");
        const data = await getEmployeePeriodDataAction(employee.id, next.month, next.year);
        setLeaveRequests(data.leaveRequests);
        setLeaveApprovals(data.leaveApprovals);
        setLeaveBalances(data.leaveBalances);
      } catch {
        // keep existing data on error
      } finally {
        setLoading(false);
      }
    }
  }

  const { month, year } = period;
  const hasPeriod = month != null && year != null;
  const monthLabel = hasPeriod
    ? format(new Date(year, month - 1, 1), "MMMM yyyy")
    : "";

  const approvedDays = leaveRequests
    .filter((request) => request.leaveStatus === "approved")
    .reduce((total, request) => total + request.totalDays, 0);
  const pendingCount = leaveRequests.filter(
    (request) => request.leaveStatus === "pending",
  ).length;
  const availableDays = leaveBalances.reduce(
    (total, balance) => total + balance.balanceDays,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <EmployeeStatCard
          label="Requests"
          value={String(hasPeriod ? leaveRequests.length : 0)}
          icon={FileStack}
          accent="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-500/10"
        />
        <EmployeeStatCard
          label="Approved days"
          value={String(hasPeriod ? approvedDays : 0)}
          icon={CheckCircle2}
          accent="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <EmployeeStatCard
          label="Pending requests"
          value={String(hasPeriod ? pendingCount : 0)}
          icon={Hourglass}
          accent="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
        />
        <EmployeeStatCard
          label="Available balance"
          value={String(hasPeriod ? availableDays : 0)}
          icon={Wallet}
          accent="text-sky-600 dark:text-sky-400"
          iconBg="bg-sky-500/10"
        />
        <div className="flex items-center justify-center rounded-xl border bg-card p-3">
          <PeriodMonthYearFilters
            period={period}
            onPeriodChange={handlePeriodChange}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card px-8 py-16">
          <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : hasPeriod ? (
        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl border bg-card">
            <OverviewSectionTitle>Leave balances</OverviewSectionTitle>
            <div className="p-4">
              <SimpleTable
                columns={[
                  { key: "leaveTypeName", header: "Leave type" },
                  { key: "balanceYear", header: "Year" },
                  { key: "allocatedDays", header: "Allocated" },
                  { key: "usedDays", header: "Used" },
                  { key: "pendingDays", header: "Pending" },
                  { key: "balanceDays", header: "Balance" },
                ]}
                data={leaveBalances as unknown as Array<Record<string, unknown>>}
                emptyTitle={`No leave balances for ${year}`}
                emptyDescription="Leave balances for this year will appear here once configured."
                scrollable
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border bg-card">
            <OverviewSectionTitle>Leave requests</OverviewSectionTitle>
            <div className="p-4">
              <SimpleTable
                columns={[
                  { key: "leaveTypeName", header: "Leave type" },
                  {
                    key: "startDate",
                    header: "Start",
                    render: (row) => formatDisplayDate(String(row.startDate ?? "")),
                  },
                  {
                    key: "endDate",
                    header: "End",
                    render: (row) => formatDisplayDate(String(row.endDate ?? "")),
                  },
                  { key: "totalDays", header: "Days" },
                  {
                    key: "appliedAt",
                    header: "Applied",
                    render: (row) =>
                      formatDisplayDate(
                        row.appliedAt ? String(row.appliedAt) : null,
                      ),
                  },
                  {
                    key: "leaveStatus",
                    header: "Status",
                    render: (row) => (
                      <LeaveStatusBadge
                        status={String(row.leaveStatus ?? "") as LeaveStatus}
                      />
                    ),
                  },
                ]}
                data={leaveRequests as unknown as Array<Record<string, unknown>>}
                emptyTitle={`No leave requests for ${monthLabel}`}
                emptyDescription="Leave requests that overlap this month will appear here."
                scrollable
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border bg-card">
            <OverviewSectionTitle>Approval history</OverviewSectionTitle>
            <div className="p-4">
              <SimpleTable
                columns={[
                  {
                    key: "approvalLevel",
                    header: "Level",
                    render: (row) => `L${row.approvalLevel ?? ""}`,
                  },
                  { key: "approverName", header: "Approver" },
                  {
                    key: "leaveStartDate",
                    header: "Leave period",
                    render: (row) =>
                      `${formatDisplayDate(String(row.leaveStartDate ?? ""))} – ${formatDisplayDate(String(row.leaveEndDate ?? ""))}`,
                  },
                  {
                    key: "approvalStatus",
                    header: "Status",
                    render: (row) => (
                      <LeaveStatusBadge
                        status={String(row.approvalStatus ?? "") as LeaveStatus}
                      />
                    ),
                  },
                  {
                    key: "actedAt",
                    header: "Acted on",
                    render: (row) =>
                      formatDisplayDate(row.actedAt ? String(row.actedAt) : null),
                  },
                  {
                    key: "comments",
                    header: "Comments",
                    render: (row) => String(row.comments ?? "—"),
                  },
                ]}
                data={leaveApprovals as unknown as Array<Record<string, unknown>>}
                emptyTitle={`No approval history for ${monthLabel}`}
                emptyDescription="Approval steps for this month will appear here once leave requests are processed."
                scrollable
              />
            </div>
          </section>
        </div>
      ) : (
        <PeriodEmptyPrompt description="Choose a period above to view this employee's leave balances, requests, and approval history." />
      )}
    </div>
  );
}
