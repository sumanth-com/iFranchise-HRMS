"use client";

import { format } from "date-fns";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { FilterSelect } from "@/components/common/filter-select";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toEmployeeSelectItems, toLookupSelectItems, withSelectOption } from "@/components/payroll/select-utils";
import { Label } from "@/components/ui/label";
import { RolesExportButtons } from "@/components/roles/roles-export-buttons";
import { RolesPagination } from "@/components/roles/roles-pagination";
import {
  assignUserRoleAction,
  changeUserRoleAction,
  removeUserRoleAction,
} from "@/lib/roles/actions";
import { canAssignUserRole } from "@/lib/roles/constants";
import { assignUserRoleSchema } from "@/lib/validations/roles";
import type { LookupOption } from "@/types/employee";
import type { UserRoleAssignment, UserRoleListResult } from "@/types/roles";

type AssignFormInput = z.input<typeof assignUserRoleSchema>;

type Props = {
  result: UserRoleListResult;
  employees: LookupOption[];
  roles: LookupOption[];
  permissionCodes: string[];
  search: string;
  roleId?: string;
};

const emptyAssignForm: AssignFormInput = {
  employeeId: "",
  roleId: "",
};

export function UserRoleAssignments({
  result,
  employees,
  roles,
  permissionCodes,
  search,
  roleId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [assignOpen, setAssignOpen] = useState(false);
  const [changeTarget, setChangeTarget] = useState<UserRoleAssignment | null>(null);

  const canAssign = canAssignUserRole(permissionCodes);

  const assignForm = useForm<AssignFormInput>({
    resolver: zodResolver(assignUserRoleSchema) as never,
    defaultValues: emptyAssignForm,
  });

  const changeForm = useForm<{ roleId: string }>({
    defaultValues: { roleId: "" },
  });

  const roleFilterItems = useMemo(
    () => withSelectOption(toLookupSelectItems(roles), { value: "all", label: "All roles" }),
    [roles],
  );
  const roleItems = useMemo(() => toLookupSelectItems(roles), [roles]);
  const employeeItems = useMemo(() => toEmployeeSelectItems(employees), [employees]);

  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    });
    if (!patch.page) params.delete("page");
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  const openAssign = useCallback(() => {
    assignForm.reset(emptyAssignForm);
    setAssignOpen(true);
  }, [assignForm]);

  const openChange = useCallback(
    (item: UserRoleAssignment) => {
      setChangeTarget(item);
      changeForm.reset({ roleId: item.roleId });
    },
    [changeForm],
  );

  function onAssign(values: AssignFormInput) {
    startTransition(async () => {
      const res = await assignUserRoleAction(values);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Role assigned");
      setAssignOpen(false);
      router.refresh();
    });
  }

  function onChangeRole(values: { roleId: string }) {
    if (!changeTarget) return;
    startTransition(async () => {
      const res = await changeUserRoleAction(changeTarget.id, values.roleId);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Role updated");
      setChangeTarget(null);
      router.refresh();
    });
  }

  const onRemove = useCallback(
    (item: UserRoleAssignment) => {
      if (!window.confirm(`Remove role "${item.roleName}" from ${item.employeeName ?? "user"}?`))
        return;
      startTransition(async () => {
        const res = await removeUserRoleAction(item.id);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Role removed");
        router.refresh();
      });
    },
    [router],
  );

  const columns = useMemo<
    DataTableColumn<UserRoleAssignment & Record<string, unknown>>[]
  >(
    () => [
      {
        key: "employeeName",
        header: "Employee",
        render: (row) => (
          <div>
            <p className="font-medium">{row.employeeName ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {row.employeeCode ?? ""}
              {row.employeeEmail ? ` · ${row.employeeEmail}` : ""}
            </p>
          </div>
        ),
      },
      {
        key: "departmentName",
        header: "Department",
        render: (row) => row.departmentName ?? "—",
      },
      {
        key: "roleName",
        header: "Role",
        render: (row) => (
          <div>
            <p className="font-medium">{row.roleName}</p>
            <p className="text-xs text-muted-foreground">{row.roleCode}</p>
          </div>
        ),
      },
      {
        key: "permissionCodes",
        header: "Permissions",
        render: (row) => (
          <div className="flex max-w-xs flex-wrap gap-1">
            {row.permissionCodes.length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              row.permissionCodes.slice(0, 5).map((code) => (
                <span
                  key={code}
                  className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  {code}
                </span>
              ))
            )}
            {row.permissionCodes.length > 5 ? (
              <span className="text-xs text-muted-foreground">
                +{row.permissionCodes.length - 5} more
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: "assignedAt",
        header: "Assigned",
        render: (row) => format(new Date(row.assignedAt), "dd MMM yyyy"),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) =>
          canAssign ? (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openChange(row)}
              >
                Change
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onRemove(row)}
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : null,
      },
    ],
    [canAssign, onRemove, openChange],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Role Assignments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign roles to employees and manage access across the organization.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RolesExportButtons entity="assignments" />
          {canAssign ? (
            <Button onClick={openAssign}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Role
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees…"
            className="pl-9"
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({ search: (e.target as HTMLInputElement).value || undefined });
              }
            }}
          />
        </div>
        <FilterSelect
          items={roleFilterItems}
          value={roleId ?? "all"}
          placeholder="All roles"
          onValueChange={(v) => updateParams({ roleId: v === "all" ? undefined : v })}
        />
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      ) : null}

      {result.data.length === 0 ? (
        <EmptyState
          title="No assignments found"
          description="Assign a role to an employee or adjust your filters."
        />
      ) : (
        <DataTable columns={columns} data={result.data} />
      )}

      <RolesPagination page={result.page} pageSize={result.pageSize} total={result.total} />

      <Modal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Assign Role"
        contentClassName="sm:max-w-lg"
        footer={
          <Button onClick={assignForm.handleSubmit(onAssign)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Assign Role
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <LabeledSelect
              items={employeeItems}
              value={assignForm.watch("employeeId")}
              onValueChange={(v) => assignForm.setValue("employeeId", v)}
              placeholder="Select employee"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <LabeledSelect
              items={roleItems}
              value={assignForm.watch("roleId")}
              onValueChange={(v) => assignForm.setValue("roleId", v)}
              placeholder="Select role"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!changeTarget}
        onOpenChange={(open) => !open && setChangeTarget(null)}
        title="Change Role"
        contentClassName="sm:max-w-lg"
        footer={
          <Button onClick={changeForm.handleSubmit(onChangeRole)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update Role
          </Button>
        }
      >
        {changeTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Change role for <span className="font-medium">{changeTarget.employeeName}</span>
            </p>
            <div className="space-y-2">
              <Label>New Role</Label>
              <LabeledSelect
                items={roleItems}
                value={changeForm.watch("roleId")}
                onValueChange={(v) => changeForm.setValue("roleId", v)}
                placeholder="Select role"
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
