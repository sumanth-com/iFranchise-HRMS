"use client";

import { format } from "date-fns";
import { AlertTriangle, Copy, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { SearchableSelect } from "@/components/common/searchable-select";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { withSelectOption } from "@/components/payroll/select-utils";
import { Label } from "@/components/ui/label";
import { RoleStatusBadge } from "@/components/roles/role-status-badge";
import { RolesExportButtons } from "@/components/roles/roles-export-buttons";
import { RolesPagination } from "@/components/roles/roles-pagination";
import { deleteRoleAction, cloneRoleAction, saveRoleAction } from "@/lib/roles/actions";
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
  const [deleteTarget, setDeleteTarget] = useState<RoleListItem | null>(null);

  const canCreate = canCreateRole(permissionCodes);
  const canEdit = canEditRole(permissionCodes);
  const canDelete = canDeleteRole(permissionCodes);

  const parentOptions = useMemo(
    () =>
      roleOptions
        .filter((r) => r.id !== editing?.id)
        .map((r) => ({
          value: r.id,
          label: r.code ? `${r.label} (${r.code})` : r.label,
        })),
    [roleOptions, editing?.id],
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
          code: editing ? values.code : undefined,
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

  const requestDelete = useCallback((item: RoleListItem) => {
    if (item.code === "super_admin") {
      toast.error("Cannot delete the Super Admin role");
      return;
    }
    setDeleteTarget(item);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const roleId = deleteTarget.id;
    startTransition(async () => {
      const res = await deleteRoleAction(roleId);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Role deleted");
      setDeleteTarget(null);
      router.refresh();
    });
  }, [deleteTarget, router]);

  const onClone = useCallback(
    (item: RoleListItem) => {
      startTransition(async () => {
        const res = await cloneRoleAction(item.id);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Role cloned");
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
          const isSuperAdmin = row.code === "super_admin";
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
              {canCreate ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onClone(row)}
                  aria-label="Clone"
                  title="Clone role"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => requestDelete(row)}
                  disabled={isSuperAdmin}
                  aria-label="Delete"
                  title={
                    isSuperAdmin
                      ? "Cannot delete the Super Admin role"
                      : "Delete role"
                  }
                >
                  <Trash2
                    className={`h-4 w-4 ${isSuperAdmin ? "text-muted-foreground" : "text-destructive"}`}
                  />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canCreate, canDelete, canEdit, onClone, openEdit, requestDelete],
  );

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage roles, inheritance, and access control definitions.
        </p>
      </div>

      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
        <div className="relative min-w-[180px] max-w-sm flex-1 basis-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles…"
            className="h-9 pl-9"
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({ search: (e.target as HTMLInputElement).value || undefined });
              }
            }}
          />
        </div>
        <FilterSelect
          className="w-[160px] shrink-0"
          items={statusFilterItems}
          value={status ?? "all"}
          placeholder="All statuses"
          onValueChange={(v) => updateParams({ status: v === "all" ? undefined : v })}
        />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <RolesExportButtons entity="roles" />
          {canCreate ? (
            <Button className="h-9 shrink-0" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Role
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
        description={
          editing
            ? "Update this role’s name, inheritance, and status."
            : "Create a role. Inheritance is optional — pick a parent if this role should inherit permissions."
        }
        contentClassName="sm:max-w-lg"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {editing ? "Save changes" : "Create role"}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">Role name</Label>
            <Input
              id="role-name"
              placeholder="e.g. HR Manager"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Description</Label>
            <textarea
              id="role-description"
              placeholder="Optional short description"
              className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...form.register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label>Inherits from</Label>
            <SearchableSelect
              options={parentOptions}
              value={form.watch("parentRoleId")}
              onValueChange={(v) => form.setValue("parentRoleId", v, { shouldDirty: true })}
              placeholder="Type to search roles…"
              noneLabel="No parent (standalone role)"
              emptyMessage="No matching roles"
            />
            <p className="text-xs text-muted-foreground">
              Type to search, then select a parent role — or leave empty for a standalone role.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <LabeledSelect
              items={statusItems}
              value={form.watch("status")}
              onValueChange={(v) => form.setValue("status", v as RecordStatus, { shouldDirty: true })}
            />
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

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => {
          if (!next && !isPending) setDeleteTarget(null);
        }}
        title="Delete role?"
        description={
          deleteTarget
            ? `Are you sure you want to delete “${deleteTarget.name}”?`
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
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || !deleteTarget}
              onClick={confirmDelete}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete role
            </Button>
          </>
        }
      >
        {deleteTarget ? (
          <div className="space-y-3">
            <div className="flex gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">This cannot be undone</p>
                <p className="text-muted-foreground">
                  The role will be removed from Roles & Access. You can recreate it later if needed.
                </p>
              </div>
            </div>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>
                Role: <span className="font-medium text-foreground">{deleteTarget.name}</span>
                {deleteTarget.code ? (
                  <span className="text-muted-foreground"> ({deleteTarget.code})</span>
                ) : null}
              </li>
              {deleteTarget.isSystemRole ? (
                <li>This is a system role. Delete only if you are sure.</li>
              ) : null}
              {deleteTarget.userCount > 0 ? (
                <li>
                  {deleteTarget.userCount} assigned user
                  {deleteTarget.userCount === 1 ? "" : "s"} will be removed from this role.
                </li>
              ) : (
                <li>No users are currently assigned to this role.</li>
              )}
            </ul>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
