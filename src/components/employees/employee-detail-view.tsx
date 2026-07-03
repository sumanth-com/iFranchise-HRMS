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
import type { EmployeeDetail } from "@/types/employee";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions/utils";

type EmployeeDetailViewProps = {
  employee: EmployeeDetail;
  profileImageUrl: string | null;
  attendance: Array<Record<string, unknown>>;
  leaveRequests: Array<Record<string, unknown>>;
  payrollItems: Array<Record<string, unknown>>;
  permissionCodes: string[];
};

export function EmployeeDetailView({
  employee,
  profileImageUrl,
  attendance,
  leaveRequests,
  payrollItems,
  permissionCodes,
}: EmployeeDetailViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") as EmployeeTab) || "overview";
  const canEdit = hasPermission(permissionCodes, "employee.edit");

  const setTab = (tab: EmployeeTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${EMPLOYEE_ROUTES.detail(employee.id)}?${params.toString()}`);
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
            <p className="text-sm text-muted-foreground">
              {employee.employeeCode} · {employee.email}
            </p>
            <div className="mt-2">
              <EmploymentStatusBadge status={employee.employmentStatus} />
            </div>
          </div>
        </div>
        {canEdit ? (
          <Link
            href={EMPLOYEE_ROUTES.edit(employee.id)}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Pencil className="size-4" />
            Edit employee
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {EMPLOYEE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setTab(tab)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm capitalize transition-colors",
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {tab}
          </button>
        ))}
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
            value={
              employee.dateOfJoining
                ? format(new Date(employee.dateOfJoining), "MMM d, yyyy")
                : "—"
            }
          />
        </div>
      ) : null}

      {activeTab === "profile" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard label="Date of birth" value={employee.profile?.dateOfBirth ?? "—"} />
          <InfoCard label="Gender" value={employee.profile?.gender ?? "—"} />
          <InfoCard label="Marital status" value={employee.profile?.maritalStatus ?? "—"} />
          <InfoCard label="Nationality" value={employee.profile?.nationality ?? "—"} />
          <InfoCard label="Personal email" value={employee.profile?.personalEmail ?? "—"} />
          <InfoCard label="Personal phone" value={employee.profile?.personalPhone ?? "—"} />
          <InfoCard label="Bio" value={employee.profile?.bio ?? "—"} className="md:col-span-2" />
        </div>
      ) : null}

      {activeTab === "employment" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard label="Employee code" value={employee.employeeCode} />
          <InfoCard label="Company email" value={employee.email} />
          <InfoCard label="Phone" value={employee.phone ?? "—"} />
          <InfoCard label="Employment status" value={employee.employmentStatus} />
          <InfoCard label="Date of leaving" value={employee.dateOfLeaving ?? "—"} />
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
        <SimpleTable
          columns={[
            { key: "attendance_date", header: "Date" },
            { key: "check_in_time", header: "Check in" },
            { key: "check_out_time", header: "Check out" },
            { key: "status", header: "Status" },
          ]}
          data={attendance}
          emptyTitle="No attendance records"
          emptyDescription="Attendance history will appear here once records exist."
        />
      ) : null}

      {activeTab === "leave" ? (
        <SimpleTable
          columns={[
            { key: "start_date", header: "Start" },
            { key: "end_date", header: "End" },
            { key: "total_days", header: "Days" },
            { key: "status", header: "Status" },
          ]}
          data={leaveRequests}
          emptyTitle="No leave requests"
          emptyDescription="Leave history will appear here once requests exist."
        />
      ) : null}

      {activeTab === "payroll" ? (
        <SimpleTable
          columns={[
            { key: "gross_pay", header: "Gross pay" },
            { key: "net_pay", header: "Net pay" },
            { key: "status", header: "Status" },
          ]}
          data={payrollItems}
          emptyTitle="No payroll records"
          emptyDescription="Payroll history will appear here once payroll runs exist."
        />
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
