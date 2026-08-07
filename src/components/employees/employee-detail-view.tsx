"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, Clock3, FileStack, Pencil } from "lucide-react";

import { EmployeeIdCard } from "@/components/employees/employee-id-card";
import {
  EmployeeAccountStatusBadge,
  getEmployeeLoginStatus,
} from "@/components/employees/employee-account-status-badge";
import { EmployeeEditForm } from "@/components/employees/employee-edit-form";
import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import { buttonVariants } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { DocumentsExplorer } from "@/components/employee/documents/documents-explorer";
import { EmployeeAssetsView } from "@/components/employee/assets/employee-assets-view";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { EmployeeDetailPayrollSection } from "@/components/employees/employee-detail-payroll-section";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { EMPLOYEE_ROUTES, EMPLOYEE_TABS, EMPLOYEE_ACCOUNT_STATUS_LABELS, type EmployeeTab } from "@/lib/employees/constants";
import { buildEmployeeRouteRef } from "@/lib/employees/routing";
import type {
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
};

function resolveActiveTab(tabParam: string | null): EmployeeTab {
  if (tabParam && EMPLOYEE_TABS.includes(tabParam as EmployeeTab)) {
    return tabParam as EmployeeTab;
  }
  return "overview";
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM d, yyyy");
}

function formatIndianPhone(phone: string | null | undefined): string {
  if (!phone?.trim()) return "—";

  const digits = phone.replace(/\D/g, "");
  if (!digits) return "—";

  let localNumber = digits;
  if (digits.startsWith("91") && digits.length >= 12) {
    localNumber = digits.slice(-10);
  } else if (digits.length > 10) {
    localNumber = digits.slice(-10);
  }

  if (localNumber.length !== 10) {
    return phone.trim();
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
}: EmployeeDetailViewProps) {
  const searchParams = useSearchParams();
  const activeTab = resolveActiveTab(searchParams.get("tab"));
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <EmployeeStatCard
              label="Present days"
              value={String(attendanceSummary.presentDays)}
              icon={CalendarDays}
              accent="text-emerald-600 dark:text-emerald-400"
              iconBg="bg-emerald-500/10"
            />
            <EmployeeStatCard
              label="Total records"
              value={String(attendanceSummary.totalRecords)}
              icon={FileStack}
              accent="text-indigo-600 dark:text-indigo-400"
              iconBg="bg-indigo-500/10"
            />
            <EmployeeStatCard
              label="Total work hours"
              value={String(attendanceSummary.totalWorkHours)}
              icon={Clock3}
              accent="text-sky-600 dark:text-sky-400"
              iconBg="bg-sky-500/10"
            />
          </div>
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
                  { key: "attendance_status", header: "Status" },
                  { key: "work_hours", header: "Hours" },
                ]}
                data={attendance}
                emptyTitle="No attendance records"
                emptyDescription="Attendance history will appear here once records exist."
              />
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "leave" ? (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border bg-card">
            <OverviewSectionTitle>Leave balances</OverviewSectionTitle>
            <div className="p-4">
              {leaveBalances.length > 0 ? (
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
                  emptyTitle="No leave balances"
                  emptyDescription="Leave balances will appear here once configured."
                />
              ) : (
                <EmptyState
                  title="No leave balances"
                  description="Leave balances will appear here once configured."
                />
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border bg-card">
            <OverviewSectionTitle>Recent requests</OverviewSectionTitle>
            {leaveRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-black text-left text-xs uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Leave type</th>
                      <th className="px-5 py-2.5 font-medium">Start</th>
                      <th className="px-5 py-2.5 font-medium">End</th>
                      <th className="px-5 py-2.5 font-medium">Days</th>
                      <th className="px-5 py-2.5 font-medium">Applied</th>
                      <th className="px-5 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((request) => (
                      <tr key={request.id} className="border-b border-border/50 last:border-0">
                        <td className="px-5 py-3">{request.leaveTypeName}</td>
                        <td className="px-5 py-3">{formatDisplayDate(request.startDate)}</td>
                        <td className="px-5 py-3">{formatDisplayDate(request.endDate)}</td>
                        <td className="px-5 py-3">{request.totalDays}</td>
                        <td className="px-5 py-3">{formatDisplayDate(request.appliedAt)}</td>
                        <td className="px-5 py-3">
                          <LeaveStatusBadge status={request.leaveStatus as LeaveStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <EmptyState
                  title="No leave requests"
                  description="Leave history will appear here once requests exist."
                />
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border bg-card">
            <OverviewSectionTitle>Approval history</OverviewSectionTitle>
            {leaveApprovals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-black text-left text-xs uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Level</th>
                      <th className="px-5 py-2.5 font-medium">Approver</th>
                      <th className="px-5 py-2.5 font-medium">Leave period</th>
                      <th className="px-5 py-2.5 font-medium">Status</th>
                      <th className="px-5 py-2.5 font-medium">Acted on</th>
                      <th className="px-5 py-2.5 font-medium">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveApprovals.map((approval) => (
                      <tr key={approval.id} className="border-b border-border/50 last:border-0">
                        <td className="px-5 py-3">L{approval.approvalLevel}</td>
                        <td className="px-5 py-3">{approval.approverName}</td>
                        <td className="px-5 py-3">
                          {formatDisplayDate(approval.leaveStartDate)} –{" "}
                          {formatDisplayDate(approval.leaveEndDate)}
                        </td>
                        <td className="px-5 py-3">
                          <LeaveStatusBadge
                            status={approval.approvalStatus as LeaveStatus}
                          />
                        </td>
                        <td className="px-5 py-3">{formatDisplayDate(approval.actedAt)}</td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {approval.comments ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <EmptyState
                  title="No approval history"
                  description="Approval steps will appear here once leave requests are processed."
                />
              </div>
            )}
          </section>
        </div>
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
}: {
  columns: DataTableColumn<Record<string, unknown>>[];
  data: Array<Record<string, unknown>>;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return <DataTable columns={columns} data={data} />;
}
