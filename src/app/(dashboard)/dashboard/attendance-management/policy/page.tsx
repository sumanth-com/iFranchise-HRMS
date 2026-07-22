import { AttendancePolicyEditor } from "@/components/attendance/attendance-policy-editor";
import { AttendancePolicyView } from "@/components/attendance/attendance-policy-view";
import { ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { canEditAttendancePolicy } from "@/lib/attendance/attendance-policy-permissions";
import { getAttendancePolicyDocument } from "@/lib/attendance/services/attendance-policy-queries";
import { getEmployeeById } from "@/lib/employees/services/employee-detail";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

function resolveEmployeeGreetingName(
  employee: Awaited<ReturnType<typeof getEmployeeById>>,
): string {
  const preferred = employee?.profile?.preferredName?.trim();
  if (preferred) return preferred;

  const firstName = employee?.firstName?.trim();
  if (firstName) return firstName;

  return "Team Member";
}

export default async function HrAttendancePolicyPage() {
  const profile = await requireServerAnyPermission(["attendance.view"]);
  const supabase = await createClient();
  const canEdit = canEditAttendancePolicy(profile);

  const [employee, document] = await Promise.all([
    getEmployeeById(supabase, profile.employee.id),
    getAttendancePolicyDocument(supabase, profile.employee.organizationId),
  ]);

  const employeeName = resolveEmployeeGreetingName(employee);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
      {canEdit ? (
        <AttendancePolicyEditor
          backHref={ATTENDANCE_ROUTES.list}
          employeeName={employeeName}
          initialDocument={document}
        />
      ) : (
        <AttendancePolicyView
          backHref={ATTENDANCE_ROUTES.list}
          backLabel="Back to Attendance"
          employeeName={employeeName}
          document={document}
        />
      )}
    </div>
  );
}
