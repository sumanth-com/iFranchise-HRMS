"use client";

import { GitCompare, Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { compareRolesAction } from "@/lib/roles/actions";
import type { LookupOption } from "@/types/employee";
import type { PermissionCatalogItem, RoleComparison } from "@/types/roles";

type Props = {
  roles: LookupOption[];
  permissionCodes: string[];
};

function PermissionList({
  items,
  emptyLabel,
  accentClass,
}: {
  items: PermissionCatalogItem[];
  emptyLabel: string;
  accentClass: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((perm) => (
        <li
          key={perm.id}
          className={`rounded-md border px-3 py-2 text-sm ${accentClass}`}
        >
          <p className="font-medium">{perm.code}</p>
          <p className="text-xs text-muted-foreground">
            {perm.module} · {perm.action}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function RoleComparison({ roles }: Props) {
  const [roleAId, setRoleAId] = useState<string>("");
  const [roleBId, setRoleBId] = useState<string>("");
  const [comparison, setComparison] = useState<RoleComparison | null>(null);
  const [isPending, startTransition] = useTransition();

  const roleItems = useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.label })),
    [roles],
  );

  function onCompare() {
    if (!roleAId || !roleBId) {
      toast.error("Select two roles to compare");
      return;
    }
    if (roleAId === roleBId) {
      toast.error("Select two different roles");
      return;
    }

    startTransition(async () => {
      const res = await compareRolesAction({ roleAId, roleBId });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setComparison(res.data);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compare Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Side-by-side comparison of effective permissions between two roles.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Role A</p>
            <LabeledSelect
              items={roleItems}
              value={roleAId}
              onValueChange={setRoleAId}
              placeholder="Select role"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Role B</p>
            <LabeledSelect
              items={roleItems}
              value={roleBId}
              onValueChange={setRoleBId}
              placeholder="Select role"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={onCompare} disabled={isPending} className="w-full sm:w-auto">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GitCompare className="mr-2 h-4 w-4" />
              )}
              Compare
            </Button>
          </div>
        </div>
      </div>

      {comparison ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-blue-700">
                Only in {comparison.roleA.name}
              </h3>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700">
                {comparison.onlyInA.length}
              </span>
            </div>
            <PermissionList
              items={comparison.onlyInA}
              emptyLabel="No unique permissions"
              accentClass="border-blue-200 bg-blue-50/50"
            />
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-emerald-700">Shared</h3>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {comparison.shared.length}
              </span>
            </div>
            <PermissionList
              items={comparison.shared}
              emptyLabel="No shared permissions"
              accentClass="border-emerald-200 bg-emerald-50/50"
            />
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-orange-700">
                Only in {comparison.roleB.name}
              </h3>
              <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-700">
                {comparison.onlyInB.length}
              </span>
            </div>
            <PermissionList
              items={comparison.onlyInB}
              emptyLabel="No unique permissions"
              accentClass="border-orange-200 bg-orange-50/50"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
