"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { differenceInMonths, format } from "date-fns";
import {
  Calendar,
  Camera,
  Palmtree,
  Pencil,
  Rocket,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import { Button, buttonVariants } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import { uploadProfileImageAction, removeProfileImageAction } from "@/lib/employees/actions";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { EMPLOYEE_ROUTES, EMPLOYEE_TABS, type EmployeeTab } from "@/lib/employees/constants";
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
  GenderType,
  MaritalStatus,
} from "@/types/employee";
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
  permissionCodes: string[];
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

function getNamePrefix(
  gender: GenderType | null | undefined,
  maritalStatus: MaritalStatus | null | undefined,
): string {
  if (gender === "male") return "Mr.";
  if (gender === "female") {
    return maritalStatus === "married" ? "Mrs." : "Miss";
  }
  return "";
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

function InsightCard({
  icon: Icon,
  title,
  description,
  accentClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  accentClassName: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            accentClassName,
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  icon: Icon,
  value,
  label,
  accentClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  accentClassName: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-4">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          accentClassName,
        )}
      >
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ProfileHeaderImage({
  employeeId,
  firstName,
  lastName,
  imageUrl: initialUrl,
  canEdit,
}: {
  employeeId: string;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setImageUrl(initialUrl);
  }, [initialUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const preview = URL.createObjectURL(file);
    setImageUrl(preview);

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadProfileImageAction(employeeId, formData);
      if (!result.success) {
        toast.error(result.message);
        setImageUrl(initialUrl);
        return;
      }

      toast.success("Profile photo updated");
      router.refresh();
    });

    event.target.value = "";
  };

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeProfileImageAction(employeeId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setImageUrl(null);
      toast.success("Profile photo removed");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="group relative size-24 overflow-hidden rounded-full border-4 border-card bg-muted shadow-sm sm:size-28">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${firstName} ${lastName}`}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted">
            <EmployeeAvatar
              firstName={firstName}
              lastName={lastName}
              signedUrl={imageUrl}
              className="size-full text-2xl"
            />
          </div>
        )}
        {canEdit ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="flex size-8 items-center justify-center rounded-full bg-white/90 text-foreground hover:bg-white disabled:cursor-not-allowed"
                aria-label="Upload profile photo"
              >
                <Camera className="size-4" />
              </button>
              {imageUrl ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isPending}
                  className="flex size-8 items-center justify-center rounded-full bg-white/90 text-destructive hover:bg-white disabled:cursor-not-allowed"
                  aria-label="Remove profile photo"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      {canEdit ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
          >
            <Camera className="size-3.5" />
            Upload
          </Button>
          {imageUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={isPending}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          ) : null}
        </div>
      ) : null}
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

function SnapshotRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 px-4 py-3.5 last:border-b-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-sm font-medium text-foreground">
        <span className="inline-block whitespace-nowrap">{value}</span>
      </div>
    </div>
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
  permissionCodes,
}: EmployeeDetailViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = resolveActiveTab(searchParams.get("tab"));
  const canEdit = hasPermission(permissionCodes, "employee.edit");
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
  const namePrefix = getNamePrefix(
    employee.profile?.gender,
    employee.profile?.maritalStatus,
  );
  const displayName = namePrefix ? `${namePrefix} ${fullName}` : fullName;
  const roleSubtitle = [employee.designationTitle, employee.branchName]
    .filter(Boolean)
    .join(" at ");
  const bio = employee.profile?.bio?.trim();
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
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="h-32 w-full bg-black sm:h-36" />
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-12 mb-5 flex justify-center sm:-mt-14">
            <ProfileHeaderImage
              employeeId={employee.id}
              firstName={employee.firstName}
              lastName={employee.lastName}
              imageUrl={profileImageUrl}
              canEdit={canEditProfile}
            />
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
                <EmploymentStatusBadge status={employee.employmentStatus} />
              </div>
              {roleSubtitle ? (
                <p className="text-sm text-muted-foreground">{roleSubtitle}</p>
              ) : null}
            </div>
            {canEdit ? (
              <Link
                href={EMPLOYEE_ROUTES.edit(employee)}
                className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
              >
                <Pencil className="size-4" />
                Edit employee
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 border-b">
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
      {activeTab === "overview" ? (
        <div className="space-y-6">
          {bio ? (
            <section className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{bio}</p>
            </section>
          ) : (
            <section className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {fullName} is part of the {employee.departmentName ?? "organization"} team
                {employee.designationTitle ? ` as ${employee.designationTitle}` : ""}.
                {employee.dateOfJoining
                  ? ` Joined on ${formatDisplayDate(employee.dateOfJoining)}.`
                  : ""}
              </p>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,28rem)] lg:items-stretch">
            <section className="flex h-full flex-col space-y-3">
              <h2 className="text-base font-semibold">Employee Information</h2>
              <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
                <OverviewInfoRow label="Employee code" value={employee.employeeCode} />
                <OverviewInfoRow label="Name" value={fullName} />
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
                <OverviewInfoRow label="Branch" value={employee.branchName ?? "—"} />
                <OverviewInfoRow
                  label="Employment type"
                  value={formatDisplayLabel(employee.employmentTypeName)}
                />
                <OverviewInfoRow
                  label="Reporting manager"
                  value={employee.reportingManagerName ?? "—"}
                />
              </div>
            </section>

            <aside className="flex h-full flex-col gap-6">
              <section className="flex flex-col space-y-3">
                <h2 className="text-base font-semibold">Profile insights</h2>
                <div className="overflow-hidden rounded-xl border bg-card">
                  <div className="space-y-3 p-4">
                    <StatBlock
                      icon={Calendar}
                      value={formatDisplayDate(employee.dateOfJoining)}
                      label="Date of joining"
                      accentClassName="bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    />
                    <InsightCard
                      icon={Rocket}
                      title="Attendance record"
                      description={`${attendanceSummary.presentDays} present days out of ${attendanceSummary.totalRecords} recorded.`}
                      accentClassName="bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    />
                    <InsightCard
                      icon={Palmtree}
                      title="Leave balance"
                      description={
                        leaveBalances.length > 0
                          ? `${leaveBalances[0].balanceDays} earned leave day(s) currently available.`
                          : "No leave balance configured yet."
                      }
                      accentClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    />
                  </div>
                </div>
              </section>

              <section className="flex min-h-0 flex-1 flex-col space-y-3">
                <h2 className="text-base font-semibold">Employment snapshot</h2>
                <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
                  <SnapshotRow label="Tenure" value={tenure} />
                  <SnapshotRow label="Attendance rate" value={attendanceRate} />
                  <SnapshotRow
                    label="Employment status"
                    value={<EmploymentStatusBadge status={employee.employmentStatus} />}
                  />
                  <SnapshotRow
                    label="Probation ends"
                    value={formatDisplayDate(probationEnd)}
                  />
                </div>
              </section>
            </aside>
          </div>
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
