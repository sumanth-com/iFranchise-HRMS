"use client";

import { format } from "date-fns";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { FilterSelect } from "@/components/common/filter-select";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toLookupSelectItems, withSelectOption } from "@/components/payroll/select-utils";
import { Label } from "@/components/ui/label";
import { RoleStatusBadge } from "@/components/roles/role-status-badge";
import { RolesExportButtons } from "@/components/roles/roles-export-buttons";
import { RolesPagination } from "@/components/roles/roles-pagination";
import { deleteRoleAction, saveRoleAction } from "@/lib/roles/actions";
import {
  canCreateRole,
  canDeleteRole,
  canEditRole,
} from "@/lib/roles/constants";
import { roleFormSchema } from "@/lib/validations/roles";
import type { RecordStatus } from "@/types/auth";
import type { LookupOption } from "@/types/employee";
import type { RoleListItem, RoleListResult } from "@/types/roles";

type RoleFormInput = z.input<typeof roleFormSchema>;

type Props = {
  result: RoleListResult;
  roleOptions: LookupOption[];
  permissionCodes: string[];
  search: string;
  status?: RecordStatus;
};

const emptyForm: RoleFormInput = {
  name: "",
  code: "",
  description: "",
  parentRoleId: null,
  isDefault: false,
  status: "active",
};

export function RolesManagement({
  result,
  roleOptions,
  permissionCodes,
  search,
  status,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleListItem | null>(null);

  const canCreate = canCreateRole(permissionCodes);
  const canEdit = canEditRole(permissionCodes);
  const canDelete = canDeleteRole(permissionCodes);

  const parentOptions = useMemo(
    () => roleOptions.filter((r) => r.id !== editing?.id),
    [roleOptions, editing?.id],
  );

  const parentRoleItems = useMemo(
    () => withSelectOption(toLookupSelectItems(parentOptions), { value: "none", label: "None" }),
    [parentOptions],
  );

  const statusItems = useMemo(
    () => [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "archived", label: "Archived" },
    ],
    [],
  );

  const statusFilterItems = useMemo(
    () => withSelectOption(statusItems, { value: "all", label: "All statuses" }),
    [statusItems],
  );

  const form = useForm<RoleFormInput>({
    resolver: zodResolver(roleFormSchema) as never,
    defaultValues: emptyForm,
  });

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

  const openCreate = useCallback(() => {
    setEditing(null);
    form.reset(emptyForm);
    setOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (item: RoleListItem) => {
      setEditing(item);
      form.reset({
        name: item.name,
        code: item.code,
        description: item.description ?? "",
        parentRoleId: item.parentRoleId,
        isDefault: item.isDefault,
        status: item.status,
      });
      setOpen(true);
    },
    [form],
  );

  function onSave(values: RoleFormInput) {
    startTransition(async () => {
      const res = await saveRoleAction(
        {
          ...values,
          description: values.description || null,
          parentRoleId: values.parentRoleId || null,
        },
        editing?.id,
      );
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? "Role updated" : "Role created");
      setOpen(false);
      router.refresh();
    });
  }

  const onDelete = useCallback(
    (item: RoleListItem) => {
      if (item.isSystemRole) {
        toast.error("System roles cannot be deleted");
        return;
      }
      if (item.userCount > 0) {
        toast.error(`Cannot delete role with ${item.userCount} assigned user(s)`);
        return;
      }
      if (!window.confirm(`Delete role "${item.name}"?`)) return;
      startTransition(async () => {
        const res = await deleteRoleAction(item.id);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Role deleted");
        router.refresh();
      });
    },
    [router],
  );

  const columns = useMemo<DataTableColumn<RoleListItem & Record<string, unknown>>[]>(
    () => [
      {
        key: "name",
        header: "Role",
        render: (row) => (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{row.name}</p>
              {row.isSystemRole ? (
                <span className="inline-flex rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700">
                  System
                </span>
              ) : null}
              {row.isDefault ? (
                <span className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Default
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{row.code}</p>
          </div>
        ),
      },
      {
        key: "parentRoleName",
        header: "Inherits From",
        render: (row) => row.parentRoleName ?? "—",
      },
      {
        key: "userCount",
        header: "Users",
        render: (row) => row.userCount,
      },
      {
        key: "permissionCount",
        header: "Permissions",
        render: (row) => row.permissionCount,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <RoleStatusBadge status={row.status} />,
      },
      {
        key: "updatedAt",
        header: "Updated",
        render: (row) => format(new Date(row.updatedAt), "dd MMM yyyy"),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => {
          const deleteBlocked = row.isSystemRole || row.userCount > 0;
          return (
            <div className="flex gap-1">
              {canEdit ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => openEdit(row)}
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onDelete(row)}
                  disabled={deleteBlocked}
                  aria-label="Delete"
                  title={
                    row.isSystemRole
                      ? "System roles cannot be deleted"
                      : row.userCount > 0
                        ? "Remove all user assignments first"
                        : "Delete role"
                  }
                >
                  <Trash2
                    className={`h-4 w-4 ${deleteBlocked ? "text-muted-foreground" : "text-destructive"}`}
                  />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canDelete, canEdit, onDelete, openEdit],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage roles, inheritance, and access control definitions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RolesExportButtons entity="roles" />
          {canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles…"
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
          items={statusFilterItems}
          value={status ?? "all"}
          placeholder="All statuses"
          onValueChange={(v) => updateParams({ status: v === "all" ? undefined : v })}
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
          title="No roles found"
          description="Add a role or adjust your filters."
        />
      ) : (
        <DataTable columns={columns} data={result.data} />
      )}

      <RolesPagination page={result.page} pageSize={result.pageSize} total={result.total} />

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Role" : "Add Role"}
        contentClassName="sm:max-w-2xl"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Role
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                {...form.register("code")}
                disabled={editing?.isSystemRole}
                placeholder="e.g. hr_manager"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...form.register("description")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Parent Role</Label>
              <LabeledSelect
                items={parentRoleItems}
                value={form.watch("parentRoleId") ?? "none"}
                onValueChange={(v) =>
                  form.setValue("parentRoleId", v === "none" ? null : v)
                }
                placeholder="None"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <LabeledSelect
                items={statusItems}
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as RecordStatus)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border"
              {...form.register("isDefault")}
            />
            Default role for new users
          </label>
        </div>
      </Modal>
    </>
  );
}
