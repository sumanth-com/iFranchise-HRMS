"use client";

import { Loader2, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toLookupSelectItems } from "@/components/payroll/select-utils";
import { Label } from "@/components/ui/label";
import { changeEmployeeRoleAction } from "@/lib/roles/actions";
import { canAssignUserRole } from "@/lib/roles/constants";
import type { EmployeeRoleAssignment } from "@/lib/roles/services/role-queries";
import type { LookupOption } from "@/types/employee";

export function EmployeeRoleSection({
  employeeId,
  assignment,
  roles,
  permissionCodes,
}: {
  employeeId: string;
  assignment: EmployeeRoleAssignment | null;
  roles: LookupOption[];
  permissionCodes: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRoleId, setSelectedRoleId] = useState(assignment?.roleId ?? "");
  const canChangeRole = canAssignUserRole(permissionCodes);

  const roleItems = useMemo(() => toLookupSelectItems(roles), [roles]);
  const hasChanges = selectedRoleId && selectedRoleId !== assignment?.roleId;

  if (!canChangeRole) return null;

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Shield className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Role & Portal Access</h3>
          <p className="text-xs text-muted-foreground">
            Changing the role updates permissions, portal, sidebar, and API access immediately.
            The employee lands in the correct portal on next login.
          </p>
        </div>
      </div>

      {assignment ? (
        <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-xs text-muted-foreground">Current role</p>
            <p className="font-medium">{assignment.roleName}</p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-xs text-muted-foreground">Portal</p>
            <p className="font-medium">{assignment.portalRoute ?? "Default"}</p>
          </div>
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">
          No active role assignment. Assign a role once the employee account is linked.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 space-y-2">
          <Label>Assign role</Label>
          <LabeledSelect
            value={selectedRoleId}
            onValueChange={setSelectedRoleId}
            items={roleItems}
            placeholder="Select role"
          />
        </div>
        <Button
          disabled={!hasChanges || isPending}
          onClick={() => {
            if (!selectedRoleId) return;
            startTransition(async () => {
              const result = await changeEmployeeRoleAction(employeeId, selectedRoleId);
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success("Role updated. Portal and permissions will apply on next login.");
              router.refresh();
            });
          }}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Update Role
        </Button>
      </div>
    </section>
  );
}
