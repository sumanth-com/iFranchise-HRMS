"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Pencil } from "lucide-react";

import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import { buttonVariants } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import { EMPLOYEE_ROUTES, EMPLOYEE_TABS, type EmployeeTab } from "@/lib/employees/constants";
import type {
  EmployeeAttendanceSummary,
  EmployeeBankAccountDetail,
  EmployeeDetail,
  EmployeeLeaveBalanceDetail,
  EmployeeSalaryStructureDetail,
  EmployeeTimelineEvent,
} from "@/types/employee";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions/utils";

type EmployeeDetailViewProps = {
  employee: EmployeeDetail;
  profileImageUrl: string | null;
  attendance: Array<Record<string, unknown>>;
  leaveRequests: Array<Record<string, unknown>>;
  payrollItems: Array<Record<string, unknown>>;
  bankAccounts: EmployeeBankAccountDetail[];
  leaveBalances: EmployeeLeaveBalanceDetail[];
  salaryStructure: EmployeeSalaryStructureDetail | null;
  attendanceSummary: EmployeeAttendanceSummary;
  timeline: EmployeeTimelineEvent[];
  permissionCodes: string[];
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

export function EmployeeDetailView({
  employee,
  profileImageUrl,
  attendance,
  leaveRequests,
  payrollItems,
  bankAccounts,
  leaveBalances,
  salaryStructure,
  attendanceSummary,
  timeline,
  permissionCodes,
}: EmployeeDetailViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = resolveActiveTab(searchParams.get("tab"));
  const canEdit = hasPermission(permissionCodes, "employee.edit");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <EmployeeAvatar
            firstName={employee.firstName}
            lastName={employee.lastName}
            signedUrl={profileImageUrl}
            className="size-16"
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="break-all text-sm text-muted-foreground">
              {employee.employeeCode} · {employee.email}
            </p>
            <div className="mt-2">
              <EmploymentStatusBadge status={employee.employmentStatus} />
            </div>
          </div>
        </div>
        {canEdit ? (
          <Link
            href={EMPLOYEE_ROUTES.edit(employee)}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Pencil className="size-4" />
            Edit employee
          </Link>
        ) : null}
      </div>

      <div className="-mx-1 overflow-x-auto border-b pb-2">
        <div className="flex min-w-max gap-2 px-1">
          {EMPLOYEE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTab(tab)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm capitalize transition-colors",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard label="Department" value={employee.departmentName ?? "—"} />
          <InfoCard label="Designation" value={employee.designationTitle ?? "—"} />
          <InfoCard label="Branch" value={employee.branchName ?? "—"} />
          <InfoCard label="Employment type" value={employee.employmentTypeName ?? "—"} />
          <InfoCard
            label="Reporting manager"
            value={employee.reportingManagerName ?? "—"}
          />
          <InfoCard
            label="Date of joining"
            value={formatDisplayDate(employee.dateOfJoining)}
          />
          <InfoCard
            label="Probation end"
            value={formatDisplayDate(
              typeof statutory.probation_end_date === "string"
                ? statutory.probation_end_date
                : null,
            )}
          />
          <InfoCard
            label="Earned leave balance"
            value={
              leaveBalances.length > 0
                ? `${leaveBalances[0].balanceDays} day(s)`
                : "—"
            }
          />
          <InfoCard
            label="Attendance summary"
            value={`${attendanceSummary.presentDays} present / ${attendanceSummary.totalRecords} recorded`}
          />
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
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Leave balances</h2>
            {leaveBalances.length > 0 ? (
              <SimpleTable
                columns={[
                  { key: "leaveTypeName", header: "Leave type" },
                  { key: "balanceYear", header: "Year" },
                  { key: "allocatedDays", header: "Allocated" },
                  { key: "usedDays", header: "Used" },
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
            <h2 className="text-sm font-medium">Leave requests</h2>
            <SimpleTable
              columns={[
                { key: "start_date", header: "Start" },
                { key: "end_date", header: "End" },
                { key: "total_days", header: "Days" },
                { key: "leave_status", header: "Status" },
              ]}
              data={leaveRequests}
              emptyTitle="No leave requests"
              emptyDescription="Leave history will appear here once requests exist."
            />
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
