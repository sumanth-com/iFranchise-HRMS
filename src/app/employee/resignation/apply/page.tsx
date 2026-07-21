import Link from "next/link";

import { ResignationSubmitForm } from "@/components/exit/resignation-submit-form";
import { buttonVariants } from "@/components/common/button";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { getExitSettings } from "@/lib/exit/services/exit-settings";
import { getEmployeeResignationSnapshot } from "@/lib/exit/services/exit-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function EmployeeApplyResignationPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "exit.create",
  ]);
  const supabase = await createClient();
  const [snapshot, settings] = await Promise.all([
    getEmployeeResignationSnapshot(supabase, profile),
    getExitSettings(supabase, profile.employee.organizationId),
  ]);

  if (snapshot.activeResignation) {
    redirect(EMPLOYEE_ROUTES.resignation);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Apply Resignation</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your request goes to your manager, then HR, then CEO for approval.
            </p>
          </div>
          <Link
            href={EMPLOYEE_ROUTES.resignation}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back
          </Link>
        </div>
        <ResignationSubmitForm
          employeeId={profile.employee.id}
          defaultNoticePeriodDays={settings.defaultNoticePeriodDays}
          redirectPath={EMPLOYEE_ROUTES.resignation}
        />
      </div>
    </div>
  );
}
