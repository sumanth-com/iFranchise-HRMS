import { format, parseISO } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmployeeSectionCard } from "@/components/employee/dashboard/employee-module-primitives";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import { getEmployeeById } from "@/lib/employees/services/employee-detail";
import { createSignedStorageUrl } from "@/lib/employees/services/employee-mutations";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

function fmtDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

export default async function EmployeeProfilePage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "employee_profile.view",
  ]);
  const supabase = await createClient();
  const employee = await getEmployeeById(supabase, profile.employee.id);

  if (!employee) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Profile not found.</div>
    );
  }

  const imagePath = employee.profile?.profileImageStoragePath ?? null;
  const avatarUrl = imagePath
    ? await createSignedStorageUrl(supabase, EMPLOYEE_STORAGE_BUCKETS.profileImages, imagePath)
    : null;
  const fullName = `${employee.firstName} ${employee.lastName}`.trim();
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile &amp; Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your personal and employment details.</p>
        </div>

        <section className="flex items-center gap-4 rounded-xl border bg-gradient-to-br from-primary/5 via-card to-card p-4 shadow-sm">
          <Avatar className="size-16 border">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
            <AvatarFallback className="text-lg font-semibold">{initials || "EE"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{fullName}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {[employee.designationTitle, employee.departmentName].filter(Boolean).join(" · ") ||
                employee.employeeCode}
            </p>
            <span className="mt-1 inline-flex rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium capitalize">
              {employee.employmentStatus.replace(/_/g, " ")}
            </span>
          </div>
        </section>

        <EmployeeSectionCard title="Employment" bodyClassName="grid gap-2 sm:grid-cols-2">
          <Field label="Employee Code" value={employee.employeeCode} />
          <Field label="Department" value={employee.departmentName} />
          <Field label="Designation" value={employee.designationTitle} />
          <Field label="Branch" value={employee.branchName} />
          <Field label="Employment Type" value={employee.employmentTypeName} />
          <Field label="Reporting Manager" value={employee.reportingManagerName} />
          <Field label="Date of Joining" value={fmtDate(employee.dateOfJoining)} />
        </EmployeeSectionCard>

        <EmployeeSectionCard title="Contact & Personal" bodyClassName="grid gap-2 sm:grid-cols-2">
          <Field label="Work Email" value={employee.email} />
          <Field label="Phone" value={employee.phone} />
          <Field label="Date of Birth" value={fmtDate(employee.profile?.dateOfBirth ?? null)} />
          <Field label="Gender" value={employee.profile?.gender ?? null} />
        </EmployeeSectionCard>
      </div>
    </div>
  );
}
