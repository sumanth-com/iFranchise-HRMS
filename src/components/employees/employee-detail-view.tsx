"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { differenceInMonths, format } from "date-fns";

import { EmployeeIdCard } from "@/components/employees/employee-id-card";
import {
  EmployeeAccountStatusBadge,
  EmployeeLoginStatusBadge,
} from "@/components/employees/employee-account-status-badge";
import { EmployeeAccountSection } from "@/components/employees/employee-account-section";
import { EmployeeRoleSection } from "@/components/employees/employee-role-section";
import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import { buttonVariants } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { EMPLOYEE_ROUTES, EMPLOYEE_TABS, type EmployeeTab } from "@/lib/employees/constants";
import { buildEmployeeRouteRef } from "@/lib/employees/routing";
import { ASSIGNMENT_STATUS_LABELS } from "@/lib/assets/constants";
import { LEAVE_ROUTES } from "@/lib/leave/constants";
import type {
  EmployeeAttendanceSummary,
  EmployeeBankAccountDetail,
  EmployeeDetail,
  EmployeeLeaveApprovalDetail,
  EmployeeLeaveBalanceDetail,
  EmployeeLeaveRequestDetail,
  EmployeeSalaryStructureDetail,
  EmployeeTimelineEvent,
} from "@/types/employee";
import type { AssetAssignmentItem } from "@/types/assets";
import type { EmployeeRoleAssignment } from "@/lib/roles/services/role-queries";
import type { LookupOption } from "@/types/employee";
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
  timeline: EmployeeTimelineEvent[];
  assets: AssetAssignmentItem[];
  permissionCodes: string[];
  roleAssignment?: EmployeeRoleAssignment | null;
  assignableRoles?: LookupOption[];
};

function resolveActiveTab(tabParam: string | null): EmployeeTab {
  if (tabParam && EMPLOYEE_TABS.includes(tabParam as EmployeeTab)) {
    return tabParam as EmployeeTab;
  }
  return "overview";
}

function formatBirthday(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "do MMMM");
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM d, yyyy");
}

function getTenure(dateOfJoining: string | null | undefined): string {
  if (!dateOfJoining) return "—";
  const start = new Date(dateOfJoining);
  if (Number.isNaN(start.getTime())) return "—";

  const months = differenceInMonths(new Date(), start);
  if (months < 1) return "Less than 1 month";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years} yr ${remainingMonths} mo`;
}

function getAttendanceRate(summary: EmployeeAttendanceSummary): string {
  if (summary.totalRecords <= 0) return "—";
  return `${Math.round((summary.presentDays / summary.totalRecords) * 100)}%`;
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
        <span className={cn("inline-block whitespace-nowrap", valueClassName)}>
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
  payrollItems,
  bankAccounts,
  leaveBalances,
  salaryStructure,
  attendanceSummary,
  timeline,
  assets,
  permissionCodes,
  roleAssignment = null,
  assignableRoles = [],
}: EmployeeDetailViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = resolveActiveTab(searchParams.get("tab"));
  const canEditEmployee = hasPermission(permissionCodes, "employee.edit");
  const canEditProfile = hasPermission(permissionCodes, "employee_profile.edit");
  const statutory = salaryStructure?.components ?? {};
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: salaryStructure?.currencyCode ?? "INR",
      maximumFractionDigits: 0,
    }).format(value);

  const setTab = (tab: EmployeeTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${EMPLOYEE_ROUTES.detail(employee)}?${params.toString()}`);
  };

  const fullName = `${employee.firstName} ${employee.lastName}`;
  const attendanceRate = getAttendanceRate(attendanceSummary);
  const tenure = getTenure(employee.dateOfJoining);
  const probationEnd =
    typeof statutory.probation_end_date === "string"
      ? statutory.probation_end_date
      : null;
  const primaryEmergencyContact =
    employee.emergencyContacts.find((contact) => contact.isPrimary) ??
    employee.emergencyContacts[0];
  const emergencyContactPhone = formatIndianPhone(primaryEmergencyContact?.phone);
  const employeePhone = formatIndianPhone(employee.phone);

  return (
    <div className="space-y-0">
      <div className="border-b">
        <div className="-mx-1 overflow-x-auto">
          <div className="flex min-w-max gap-6 px-1">
            {EMPLOYEE_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setTab(tab)}
                className={cn(
                  "shrink-0 border-b-2 px-1 py-3 text-sm capitalize transition-colors",
                  activeTab === tab
                    ? "border-teal-700 font-medium text-teal-800 dark:border-teal-500 dark:text-teal-400"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6">
      {canEditEmployee ? (
        <div className="mb-4 flex justify-end">
          <Link
            href={EMPLOYEE_ROUTES.edit(employee)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Edit & save {activeTab}
          </Link>
        </div>
      ) : null}

      {activeTab === "overview" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,22rem)] lg:items-start">
          <section className="flex flex-col space-y-3">
            <h2 className="text-base font-semibold">Employee Information</h2>
            <div className="overflow-hidden rounded-xl border bg-card">
              <OverviewInfoRow
                label="Email"
                value={employee.email}
                href={`mailto:${employee.email}`}
              />
              <OverviewInfoRow
                label="Phone number"
                value={employeePhone}
                valueClassName="tabular-nums tracking-wide"
              />
              <OverviewInfoRow
                label="Emergency contact"
                value={emergencyContactPhone}
                valueClassName="tabular-nums tracking-wide"
              />
              <OverviewInfoRow
                label="Gender"
                value={formatDisplayLabel(employee.profile?.gender)}
              />
              <OverviewInfoRow
                label="Birthday"
                value={formatBirthday(employee.profile?.dateOfBirth)}
              />
              <OverviewInfoRow
                label="Department"
                value={employee.departmentName ?? "—"}
              />
              <OverviewInfoRow
                label="Reporting manager"
                value={employee.reportingManagerName ?? "—"}
              />
              <OverviewInfoRow label="Tenure" value={tenure} />
              <OverviewInfoRow label="Attendance rate" value={attendanceRate} />
              <OverviewDetailRow label="Employment status">
                <EmploymentStatusBadge status={employee.employmentStatus} />
              </OverviewDetailRow>
              <OverviewDetailRow label="Account status">
                <EmployeeAccountStatusBadge status={employee.accountStatus} />
                <EmployeeLoginStatusBadge status={employee.accountStatus} />
              </OverviewDetailRow>
              <OverviewInfoRow
                label="Probation ends"
                value={formatDisplayDate(probationEnd)}
              />
            </div>
          </section>

          <aside className="flex flex-col items-center overflow-visible pr-5 pt-8 lg:sticky lg:top-4">
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
            />
          </aside>
        </div>
      ) : null}

      {activeTab === "account" ? (
        <div className="space-y-6">
          <EmployeeRoleSection
            employeeId={employee.id}
            assignment={roleAssignment}
            roles={assignableRoles}
            permissionCodes={permissionCodes}
          />
          <EmployeeAccountSection employee={employee} permissionCodes={permissionCodes} />
        </div>
      ) : null}

      {activeTab === "profile" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard
            label="Date of birth"
            value={formatDisplayDate(employee.profile?.dateOfBirth)}
          />
          <InfoCard label="Gender" value={employee.profile?.gender ?? "—"} />
          <InfoCard label="Marital status" value={employee.profile?.maritalStatus ?? "—"} />
          <InfoCard label="Nationality" value={employee.profile?.nationality ?? "—"} />
          <InfoCard label="Blood group" value={employee.profile?.bloodGroup ?? "—"} />
          <InfoCard label="Personal email" value={employee.profile?.personalEmail ?? "—"} />
          <InfoCard label="Personal phone" value={employee.profile?.personalPhone ?? "—"} />
          <InfoCard
            label="Aadhaar"
            value={String(statutory.aadhaar_number ?? "—")}
          />
          <InfoCard label="PAN" value={String(statutory.pan_number ?? "—")} />
          <InfoCard label="UAN" value={String(statutory.uan ?? "—")} />
          <InfoCard label="PF number" value={String(statutory.pf_number ?? "—")} />
          <InfoCard label="ESI number" value={String(statutory.esi_number ?? "—")} />
          <InfoCard label="Bio" value={employee.profile?.bio ?? "—"} className="md:col-span-2" />
        </div>
      ) : null}

      {activeTab === "employment" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard label="Employee code" value={employee.employeeCode} />
          <InfoCard label="Company email" value={employee.email} />
          <InfoCard label="Phone" value={employee.phone ?? "—"} />
          <InfoCard label="Employment status" value={employee.employmentStatus} />
          <InfoCard
            label="Probation end"
            value={formatDisplayDate(
              typeof statutory.probation_end_date === "string"
                ? statutory.probation_end_date
                : null,
            )}
          />
          <InfoCard
            label="Date of leaving"
            value={formatDisplayDate(employee.dateOfLeaving)}
          />
          <InfoCard label="Record status" value={employee.status} />
        </div>
      ) : null}

      {activeTab === "address" ? (
        employee.addresses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {employee.addresses.map((address) => (
              <div key={address.id} className="rounded-lg border p-4">
                <p className="font-medium capitalize">{address.addressType}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {address.addressLine1}
                  {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {address.city}, {address.state ?? ""} {address.postalCode ?? ""}
                </p>
                <p className="text-sm text-muted-foreground">{address.country}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No addresses" description="No address records for this employee." />
        )
      ) : null}

      {activeTab === "emergency" ? (
        employee.emergencyContacts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {employee.emergencyContacts.map((contact) => (
              <div key={contact.id} className="rounded-lg border p-4">
                <p className="font-medium">{contact.name}</p>
                <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                <p className="mt-2 text-sm">{contact.phone}</p>
                <p className="text-sm text-muted-foreground">{contact.email ?? "—"}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No emergency contacts"
            description="No emergency contacts recorded for this employee."
          />
        )
      ) : null}

      {activeTab === "documents" ? (
        employee.documents.length > 0 ? (
          <div className="space-y-3">
            {employee.documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-col gap-1 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{document.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {document.documentTypeName ?? "Document"} · {document.fileName}
                  </p>
                </div>
                <span className="text-sm capitalize text-muted-foreground">
                  {document.documentStatus}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No documents" description="No documents uploaded for this employee." />
        )
      ) : null}

      {activeTab === "assets" ? (
        assets.length > 0 ? (
          <div className="space-y-3">
            {assets.map((assignment) => (
              <div
                key={assignment.id}
                className="flex flex-col gap-1 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {assignment.assetCode} — {assignment.assetName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {assignment.categoryName ?? "Asset"} · Assigned{" "}
                    {formatDisplayDate(assignment.assignedDate)}
                    {assignment.returnedDate
                      ? ` · Returned ${formatDisplayDate(assignment.returnedDate)}`
                      : ""}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {ASSIGNMENT_STATUS_LABELS[assignment.assignmentStatus]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No assets assigned"
            description="Company assets assigned to this employee will appear here."
          />
        )
      ) : null}

      {activeTab === "attendance" ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard
              label="Present days"
              value={String(attendanceSummary.presentDays)}
            />
            <InfoCard
              label="Total records"
              value={String(attendanceSummary.totalRecords)}
            />
            <InfoCard
              label="Total work hours"
              value={String(attendanceSummary.totalWorkHours)}
            />
          </div>
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
      ) : null}

      {activeTab === "leave" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Leave balances, recent requests, and approval history.
            </p>
            {hasPermission(permissionCodes, "leave.create") ? (
              <Link
                href={`${LEAVE_ROUTES.new}?employeeId=${employee.id}`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Request leave
              </Link>
            ) : null}
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Leave balances</h2>
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
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Recent requests</h2>
            {leaveRequests.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">Leave type</th>
                      <th className="px-4 py-2.5 text-left font-medium">Start</th>
                      <th className="px-4 py-2.5 text-left font-medium">End</th>
                      <th className="px-4 py-2.5 text-left font-medium">Days</th>
                      <th className="px-4 py-2.5 text-left font-medium">Applied</th>
                      <th className="px-4 py-2.5 text-left font-medium">Status</th>
                      <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((request) => (
                      <tr key={request.id} className="border-b last:border-0">
                        <td className="px-4 py-3">{request.leaveTypeName}</td>
                        <td className="px-4 py-3">{formatDisplayDate(request.startDate)}</td>
                        <td className="px-4 py-3">{formatDisplayDate(request.endDate)}</td>
                        <td className="px-4 py-3">{request.totalDays}</td>
                        <td className="px-4 py-3">{formatDisplayDate(request.appliedAt)}</td>
                        <td className="px-4 py-3">
                          <LeaveStatusBadge status={request.leaveStatus as LeaveStatus} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {hasPermission(permissionCodes, "leave.view") ? (
                            <Link
                              href={LEAVE_ROUTES.detail(request.id)}
                              className={cn(
                                buttonVariants({ variant: "ghost", size: "sm" }),
                                "h-8",
                              )}
                            >
                              View
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No leave requests"
                description="Leave history will appear here once requests exist."
              />
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Approval history</h2>
            {leaveApprovals.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">Level</th>
                      <th className="px-4 py-2.5 text-left font-medium">Approver</th>
                      <th className="px-4 py-2.5 text-left font-medium">Leave period</th>
                      <th className="px-4 py-2.5 text-left font-medium">Status</th>
                      <th className="px-4 py-2.5 text-left font-medium">Acted on</th>
                      <th className="px-4 py-2.5 text-left font-medium">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveApprovals.map((approval) => (
                      <tr key={approval.id} className="border-b last:border-0">
                        <td className="px-4 py-3">L{approval.approvalLevel}</td>
                        <td className="px-4 py-3">{approval.approverName}</td>
                        <td className="px-4 py-3">
                          {formatDisplayDate(approval.leaveStartDate)} –{" "}
                          {formatDisplayDate(approval.leaveEndDate)}
                        </td>
                        <td className="px-4 py-3">
                          <LeaveStatusBadge
                            status={approval.approvalStatus as LeaveStatus}
                          />
                        </td>
                        <td className="px-4 py-3">{formatDisplayDate(approval.actedAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {approval.comments ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No approval history"
                description="Approval steps will appear here once leave requests are processed."
              />
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "payroll" ? (
        <div className="space-y-4">
          {salaryStructure ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoCard
                label="Effective from"
                value={format(new Date(salaryStructure.effectiveFrom), "MMM d, yyyy")}
              />
              <InfoCard
                label="Gross salary"
                value={formatCurrency(salaryStructure.grossSalary)}
              />
              <InfoCard
                label="Net salary"
                value={formatCurrency(salaryStructure.netSalary)}
              />
              <InfoCard
                label="Basic"
                value={formatCurrency(salaryStructure.basicSalary)}
              />
              <InfoCard
                label="HRA"
                value={formatCurrency(salaryStructure.hraAmount)}
              />
              <InfoCard
                label="Transport"
                value={formatCurrency(salaryStructure.transportAllowance)}
              />
            </div>
          ) : (
            <EmptyState
              title="No salary structure"
              description="Salary structure has not been configured for this employee."
            />
          )}
          {bankAccounts.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium">Bank accounts</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {bankAccounts.map((account) => (
                  <div key={account.id} className="rounded-lg border p-4">
                    <p className="font-medium">{account.bankName}</p>
                    <p className="text-sm text-muted-foreground">
                      {account.accountHolderName}
                    </p>
                    <p className="mt-2 text-sm">{account.accountNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      IFSC: {account.ifscCode ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Payroll history</h2>
            <SimpleTable
              columns={[
                { key: "payroll_month", header: "Pay period" },
                { key: "gross_salary", header: "Gross pay" },
                { key: "net_salary", header: "Net pay" },
                { key: "payroll_status", header: "Payroll status" },
              ]}
              data={payrollItems}
              emptyTitle="No payroll records"
              emptyDescription="Payroll history will appear here once payroll runs exist."
            />
          </section>
        </div>
      ) : null}

      {activeTab === "timeline" ? (
        timeline.length > 0 ? (
          <div className="space-y-3">
            {timeline.map((event) => (
              <div key={event.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="font-medium capitalize">
                    {String(event.event).replaceAll("_", " ")}
                  </p>
                  <p className="shrink-0 text-sm text-muted-foreground">
                    {format(new Date(event.occurredAt), "MMM d, yyyy p")}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {event.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No timeline events"
            description="Employee lifecycle events will appear here."
          />
        )
      ) : null}
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
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
