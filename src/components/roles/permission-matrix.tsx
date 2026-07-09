"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  fetchRolePermissionDetailAction,
  saveRolePermissionsAction,
} from "@/lib/roles/actions";
import { canAssignPermissions } from "@/lib/roles/constants";
import type { LookupOption } from "@/types/employee";
import type { PermissionMatrixModule, RolePermissionDetail } from "@/types/roles";

type Props = {
  roles: LookupOption[];
  initialRoleId?: string;
  permissionCodes: string[];
  matrix: PermissionMatrixModule[];
  detail: RolePermissionDetail;
};

export function PermissionMatrix({
  roles,
  initialRoleId,
  permissionCodes,
  matrix,
  detail: initialDetail,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoleId ?? initialDetail.roleId);
  const [detail, setDetail] = useState(initialDetail);
  const [directIds, setDirectIds] = useState<Set<string>>(
    () => new Set(initialDetail.directPermissionIds),
  );

  const canAssign = canAssignPermissions(permissionCodes);

  const inheritedSet = useMemo(
    () => new Set(detail.inheritedPermissionIds),
    [detail.inheritedPermissionIds],
  );

  const loadDetail = useCallback(async (roleId: string) => {
    setLoadingDetail(true);
    const res = await fetchRolePermissionDetailAction(roleId);
    setLoadingDetail(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    setDetail(res.data.detail);
    setDirectIds(new Set(res.data.detail.directPermissionIds));
  }, []);

  useEffect(() => {
    if (selectedRoleId !== initialDetail.roleId) {
      void loadDetail(selectedRoleId);
    }
  }, [selectedRoleId, initialDetail.roleId, loadDetail]);

  function handleRoleChange(roleId: string) {
    setSelectedRoleId(roleId);
    const params = new URLSearchParams(window.location.search);
    params.set("roleId", roleId);
    router.push(`?${params.toString()}`);
  }

  function togglePermission(permId: string, checked: boolean) {
    if (inheritedSet.has(permId)) return;
    setDirectIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(permId);
      else next.delete(permId);
      return next;
    });
  }

  function toggleModule(modulePerms: { id: string }[], checked: boolean) {
    setDirectIds((prev) => {
      const next = new Set(prev);
      for (const perm of modulePerms) {
        if (inheritedSet.has(perm.id)) continue;
        if (checked) next.add(perm.id);
        else next.delete(perm.id);
      }
      return next;
    });
  }

  function onSave() {
    startTransition(async () => {
      const res = await saveRolePermissionsAction({
        roleId: selectedRoleId,
        permissionIds: [...directIds],
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Permissions saved");
      router.refresh();
      await loadDetail(selectedRoleId);
    });
  }

  const roleItems = useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.label })),
    [roles],
  );

  const inheritanceText = detail.parentRoleName
    ? `Inherits permissions from "${detail.parentRoleName}"`
    : "No parent role — all permissions are direct";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Permission Matrix</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign direct permissions per role. Inherited permissions are read-only.
          </p>
        </div>
        {canAssign ? (
          <Button onClick={onSave} disabled={isPending || loadingDetail}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Permissions
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Role</p>
            <LabeledSelect
              items={roleItems}
              value={selectedRoleId}
              onValueChange={handleRoleChange}
              placeholder="Select role"
            />
          </div>
          <div className="flex items-end">
            <p className="text-sm text-muted-foreground">{inheritanceText}</p>
          </div>
        </div>
      </div>

      {loadingDetail ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading permissions…
        </div>
      ) : (
        <div className="space-y-4">
          {matrix.map((mod) => {
            const editablePerms = mod.permissions.filter((p) => !inheritedSet.has(p.id));
            const allDirectChecked =
              editablePerms.length > 0 && editablePerms.every((p) => directIds.has(p.id));
            const someDirectChecked = editablePerms.some((p) => directIds.has(p.id));

            return (
              <div key={mod.module} className="rounded-xl border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <h3 className="text-sm font-semibold">{mod.label}</h3>
                  {canAssign && editablePerms.length > 0 ? (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border"
                        checked={allDirectChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = someDirectChecked && !allDirectChecked;
                        }}
                        onChange={(e) => toggleModule(editablePerms, e.target.checked)}
                      />
                      Select all
                    </label>
                  ) : null}
                </div>
                <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {mod.permissions.map((perm) => {
                    const isInherited = inheritedSet.has(perm.id);
                    const isChecked = isInherited || directIds.has(perm.id);

                    return (
                      <label
                        key={perm.id}
                        className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                          isInherited ? "bg-muted/50 opacity-80" : "bg-background"
                        }`}
                        title={perm.description ?? perm.code}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border"
                          checked={isChecked}
                          disabled={!canAssign || isInherited}
                          onChange={(e) => togglePermission(perm.id, e.target.checked)}
                        />
                        <span>
                          <span className="font-medium">{perm.action}</span>
                          <span className="block text-xs text-muted-foreground">{perm.code}</span>
                          {isInherited ? (
                            <span className="mt-0.5 block text-xs text-violet-600">Inherited</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
