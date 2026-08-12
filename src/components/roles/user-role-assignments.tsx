"use client";

import { format } from "date-fns";
import { AlertTriangle, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import {
  toEmployeeSelectItems,
  toLookupSelectItems,
  withSelectOption,
} from "@/components/payroll/select-utils";
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
  const [removeTarget, setRemoveTarget] = useState<UserRoleAssignment | null>(null);

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

  const confirmRemove = useCallback(() => {
    if (!removeTarget) return;
    const id = removeTarget.id;
    startTransition(async () => {
      const res = await removeUserRoleAction(id);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Role removed");
      setRemoveTarget(null);
      router.refresh();
    });
  }, [removeTarget, router]);

  const columns = useMemo<DataTableColumn<UserRoleAssignment & Record<string, unknown>>[]>(
    () => [
      {
        key: "employeeName",
        header: "Employee",
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.employeeName ?? "—"}</p>
            {row.employeeCode ? (
              <p className="truncate text-xs text-muted-foreground">{row.employeeCode}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: "departmentName",
        header: "Department",
        render: (row) => (
          <span className="text-sm text-muted-foreground">{row.departmentName ?? "—"}</span>
        ),
      },
      {
        key: "roleName",
        header: "Role",
        render: (row) => <span className="font-medium">{row.roleName}</span>,
      },
      {
        key: "assignedAt",
        header: "Assigned",
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.assignedAt), "dd MMM yyyy")}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) =>
          canAssign ? (
            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => openChange(row)}
                aria-label="Change role"
                title="Change role"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setRemoveTarget(row)}
                aria-label="Remove role"
                title="Remove role"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : null,
      },
    ],
    [canAssign, openChange],
  );

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          See who has which role, and assign or change access.
        </p>
      </div>

      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
        <div className="relative min-w-[180px] max-w-sm flex-1 basis-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code…"
            className="h-9 pl-9"
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({
                  search: (e.target as HTMLInputElement).value || undefined,
                });
              }
            }}
          />
        </div>
        <FilterSelect
          className="w-[180px] shrink-0"
          items={roleFilterItems}
          value={roleId ?? "all"}
          placeholder="All roles"
          onValueChange={(v) => updateParams({ roleId: v === "all" ? undefined : v })}
        />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <RolesExportButtons entity="assignments" />
          {canAssign ? (
            <Button className="h-9 shrink-0" onClick={openAssign}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Role
            </Button>
          ) : null}
        </div>
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      ) : null}

      {result.data.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          description="Assign a role to an employee, or adjust your filters."
        />
      ) : (
        <DataTable columns={columns} data={result.data} />
      )}

      <RolesPagination page={result.page} pageSize={result.pageSize} total={result.total} />

      <Modal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Assign role"
        description="Pick an employee and the role they should have."
        contentClassName="sm:max-w-md"
        footer={
          <Button onClick={assignForm.handleSubmit(onAssign)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Assign role
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
              triggerClassName="h-9 w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <LabeledSelect
              items={roleItems}
              value={assignForm.watch("roleId")}
              onValueChange={(v) => assignForm.setValue("roleId", v)}
              placeholder="Select role"
              triggerClassName="h-9 w-full"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(changeTarget)}
        onOpenChange={(open) => !open && setChangeTarget(null)}
        title="Change role"
        description={
          changeTarget
            ? `Update the role for ${changeTarget.employeeName ?? "this employee"}.`
            : undefined
        }
        contentClassName="sm:max-w-md"
        footer={
          <Button onClick={changeForm.handleSubmit(onChangeRole)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save role
          </Button>
        }
      >
        {changeTarget ? (
          <div className="space-y-2">
            <Label>Role</Label>
            <LabeledSelect
              items={roleItems}
              value={changeForm.watch("roleId")}
              onValueChange={(v) => changeForm.setValue("roleId", v)}
              placeholder="Select role"
              triggerClassName="h-9 w-full"
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open && !isPending) setRemoveTarget(null);
        }}
        title="Remove role?"
        description={
          removeTarget
            ? `Remove “${removeTarget.roleName}” from ${removeTarget.employeeName ?? "this employee"}?`
            : undefined
        }
        contentClassName="sm:max-w-md"
        showCancel={false}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setRemoveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || !removeTarget}
              onClick={confirmRemove}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remove role
            </Button>
          </>
        }
      >
        {removeTarget ? (
          <div className="flex gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm text-muted-foreground">
              They will lose access linked to this role until you assign another one.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
