import { LeaveForm } from "@/components/leave/leave-form";
import { SELF_LEAVE_ROUTES } from "@/lib/leave/constants";
import { getLeaveLookups } from "@/lib/leave/services/leave-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function NewSelfLeavePage() {
  const profile = await requireServerPermission("leave.create");
  const supabase = await createClient();
  const lookups = await getLeaveLookups(supabase, profile.employee.organizationId);

  // Self-service: only apply for yourself.
  const self =
    lookups.employees.find((employee) => employee.id === profile.employee.id) ?? {
      id: profile.employee.id,
      label: `${profile.employee.firstName} ${profile.employee.lastName}`.trim(),
      code: profile.employee.employeeCode,
    };
  const scopedLookups = { ...lookups, employees: [self] };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Apply for Leave</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit a leave request for approval by your manager and HR.
        </p>
      </div>
      <LeaveForm
        lookups={scopedLookups}
        defaultEmployeeId={profile.employee.id}
        redirectPath={SELF_LEAVE_ROUTES.list}
      />
    </div>
  );
}
