import { LeaveForm } from "@/components/leave/leave-form";
import { createClient } from "@/lib/supabase/server";
import { getLeaveApplyDialogDescription } from "@/lib/leave/leave-approval-copy";
import { getLeaveLookups } from "@/lib/leave/services/leave-queries";
import { requireServerPermission } from "@/lib/permissions/server";

type LeavePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewLeavePage({
  searchParams,
}: LeavePageProps) {
  const profile = await requireServerPermission("leave.create");
  const supabase = await createClient();
  const rawParams = await searchParams;
  const employeeIdParam =
    typeof rawParams.employeeId === "string" ? rawParams.employeeId : undefined;
  const lookups = await getLeaveLookups(supabase, profile.employee.organizationId);
  const canSelectEmployee = lookups.employees.length > 1;
  const defaultEmployeeId =
    employeeIdParam &&
    canSelectEmployee &&
    lookups.employees.some((employee) => employee.id === employeeIdParam)
      ? employeeIdParam
      : profile.employee.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Leave Request</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {getLeaveApplyDialogDescription(
            profile.roles.map((role) => role.code),
            2,
          )}
        </p>
      </div>
      <LeaveForm lookups={lookups} defaultEmployeeId={defaultEmployeeId} />
    </div>
  );
}
