"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { AccessPreviewPanel } from "@/components/roles/access-preview-panel";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  fetchRoleAccessPreviewAction,
  fetchRolePermissionDetailAction,
  saveRolePermissionsAction,
} from "@/lib/roles/actions";
import { canAssignPermissions } from "@/lib/roles/constants";
import { cn } from "@/lib/utils";
import type { LookupOption } from "@/types/employee";
import type { PermissionMatrixModule, RoleAccessPreview, RolePermissionDetail } from "@/types/roles";

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
  const [preview, setPreview] = useState<RoleAccessPreview | null>(null);
  const [moduleQuery, setModuleQuery] = useState("");

  const canAssign = canAssignPermissions(permissionCodes);

  const inheritedSet = useMemo(
    () => new Set(detail.inheritedPermissionIds),
    [detail.inheritedPermissionIds],
  );

  const loadDetail = useCallback(async (roleId: string) => {
    setLoadingDetail(true);
    const [res, previewRes] = await Promise.all([
      fetchRolePermissionDetailAction(roleId),
      fetchRoleAccessPreviewAction(roleId),
    ]);
    setLoadingDetail(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    setDetail(res.data.detail);
    setDirectIds(new Set(res.data.detail.directPermissionIds));
    if (previewRes.success) setPreview(previewRes.data.preview);
  }, []);

  useEffect(() => {
    void loadDetail(selectedRoleId);
  }, [selectedRoleId, loadDetail]);

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

  const filteredMatrix = useMemo(() => {
    const q = moduleQuery.trim().toLowerCase();
    if (!q) return matrix;
    return matrix.filter(
      (mod) =>
        mod.label.toLowerCase().includes(q) ||
        mod.module.toLowerCase().includes(q) ||
        mod.permissions.some(
          (perm) =>
            perm.action.toLowerCase().includes(q) ||
            perm.code.toLowerCase().includes(q),
        ),
    );
  }, [matrix, moduleQuery]);

  const selectedCount = directIds.size;
  const inheritedCount = detail.inheritedPermissionIds.length;

  const inheritanceText = detail.parentRoleName
    ? `Inherits from “${detail.parentRoleName}”`
    : "Standalone role · no inheritance";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Permission Matrix</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grant or revoke direct permissions. Inherited permissions stay read-only.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="min-w-[180px] max-w-xs flex-1 basis-[200px]">
          <LabeledSelect
            items={roleItems}
            value={selectedRoleId}
            onValueChange={handleRoleChange}
            placeholder="Select role"
            triggerClassName="h-9 w-full"
          />
        </div>
        <p className="text-sm text-muted-foreground">{inheritanceText}</p>
        <div className="relative ml-auto min-w-[160px] max-w-xs flex-1 basis-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={moduleQuery}
            onChange={(e) => setModuleQuery(e.target.value)}
            placeholder="Filter modules…"
            className="h-9 pl-9"
          />
        </div>
        {canAssign ? (
          <Button
            className="h-9 shrink-0"
            onClick={onSave}
            disabled={isPending || loadingDetail}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Permissions
          </Button>
        ) : null}
      </div>

      {preview && !loadingDetail ? (
        <AccessPreviewPanel preview={preview} variant="summary" className="shrink-0" />
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>
          Direct: <span className="font-medium text-foreground">{selectedCount}</span>
        </span>
        <span>
          Inherited: <span className="font-medium text-foreground">{inheritedCount}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-violet-500" />
          Inherited (locked)
        </span>
      </div>

      {loadingDetail ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading permissions…
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-card">
          <div className="h-full max-h-[min(62vh,720px)] overflow-y-auto">
            {filteredMatrix.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No modules match “{moduleQuery}”.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 border-b bg-card">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="w-[180px] px-3 py-2.5 font-medium sm:w-[220px]">Module</th>
                    <th className="px-3 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatrix.map((mod) => {
                    const editablePerms = mod.permissions.filter((p) => !inheritedSet.has(p.id));
                    const allDirectChecked =
                      editablePerms.length > 0 &&
                      editablePerms.every((p) => directIds.has(p.id));
                    const someDirectChecked = editablePerms.some((p) => directIds.has(p.id));
                    const grantedCount = mod.permissions.filter(
                      (p) => inheritedSet.has(p.id) || directIds.has(p.id),
                    ).length;

                    return (
                      <tr key={mod.module} className="border-b last:border-b-0">
                        <td className="align-top px-3 py-2.5">
                          <div className="flex items-start gap-2">
                            {canAssign && editablePerms.length > 0 ? (
                              <input
                                type="checkbox"
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border"
                                checked={allDirectChecked}
                                ref={(el) => {
                                  if (el) {
                                    el.indeterminate =
                                      someDirectChecked && !allDirectChecked;
                                  }
                                }}
                                onChange={(e) =>
                                  toggleModule(editablePerms, e.target.checked)
                                }
                                title="Select all direct actions"
                                aria-label={`Select all ${mod.label}`}
                              />
                            ) : null}
                            <div className="min-w-0">
                              <p className="font-medium leading-tight">{mod.label}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {grantedCount}/{mod.permissions.length}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            {mod.permissions.map((perm) => {
                              const isInherited = inheritedSet.has(perm.id);
                              const isChecked = isInherited || directIds.has(perm.id);

                              return (
                                <label
                                  key={perm.id}
                                  title={perm.description ?? perm.code}
                                  className={cn(
                                    "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                                    isInherited
                                      ? "cursor-default border-violet-200 bg-violet-50 text-violet-800"
                                      : isChecked
                                        ? "border-foreground/20 bg-foreground/5"
                                        : "bg-background hover:bg-muted/60",
                                    !canAssign && "cursor-default",
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    className="h-3 w-3 rounded border"
                                    checked={isChecked}
                                    disabled={!canAssign || isInherited}
                                    onChange={(e) =>
                                      togglePermission(perm.id, e.target.checked)
                                    }
                                  />
                                  <span className="capitalize">{perm.action}</span>
                                </label>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
