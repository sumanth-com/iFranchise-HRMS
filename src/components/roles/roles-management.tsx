"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  Ban,
  Copy,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
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
import { RoleDetailDrawer } from "@/components/roles/role-detail-drawer";
import { RoleStatusBadge } from "@/components/roles/role-status-badge";
import { RolesExportButtons } from "@/components/roles/roles-export-buttons";
import { RolesPagination } from "@/components/roles/roles-pagination";
import { deleteRoleAction, cloneRoleAction, saveRoleAction } from "@/lib/roles/actions";
import {
  canCreateRole,
  canDeleteRole,
  canEditRole,
} from "@/lib/roles/constants";
import {
  canDeleteRoleRecord,
  canDisableRoleRecord,
} from "@/lib/roles/protected-roles";
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
  roleType?: "system" | "custom";
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
  roleType,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleListItem | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleListItem | null>(null);
  const [cloneTarget, setCloneTarget] = useState<RoleListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<RoleListItem | null>(null);

  const canCreate = canCreateRole(permissionCodes);
  const canEdit = canEditRole(permissionCodes);
  const canDelete = canDeleteRole(permissionCodes);
  const editingSystem = Boolean(editing?.isSystemRole);

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
      { value: "inactive", label: "Disabled" },
    ],
    [],
  );

  const statusFilterItems = useMemo(
    () => withSelectOption(statusItems, { value: "all", label: "All statuses" }),
    [statusItems],
  );

  const typeFilterItems = useMemo(
    () => [
      { value: "all", label: "All types" },
      { value: "system", label: "System" },
      { value: "custom", label: "Custom" },
    ],
    [],
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
    if (!canDeleteRoleRecord(item)) {
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

  const confirmClone = useCallback(() => {
    if (!cloneTarget) return;
    const roleId = cloneTarget.id;
    startTransition(async () => {
      const res = await cloneRoleAction(roleId);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Role duplicated as a custom role");
      setCloneTarget(null);
      router.refresh();
    });
  }, [cloneTarget, router]);

  const confirmStatusChange = useCallback(() => {
    if (!statusTarget) return;
    const nextStatus: RecordStatus = statusTarget.status === "active" ? "inactive" : "active";
    startTransition(async () => {
      const res = await saveRoleAction(
        {
          name: statusTarget.name,
          description: statusTarget.description,
          parentRoleId: statusTarget.parentRoleId,
          isDefault: statusTarget.isDefault,
          status: nextStatus,
        },
        statusTarget.id,
      );
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(nextStatus === "active" ? "Role enabled" : "Role disabled");
      setStatusTarget(null);
      router.refresh();
    });
  }, [statusTarget, router]);

  const columns = useMemo<DataTableColumn<RoleListItem & Record<string, unknown>>[]>(
    () => [
      {
        key: "name",
        header: "Role",
        render: (row) => (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{row.name}</p>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  row.isSystemRole
                    ? "bg-violet-500/10 text-violet-700"
                    : "bg-sky-500/10 text-sky-700"
                }`}
              >
                {row.isSystemRole ? "System" : "Custom"}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {row.description || row.code}
            </p>
          </div>
        ),
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
        render: (row) => (
          <RoleStatusBadge status={row.status === "archived" ? "inactive" : row.status} />
        ),
      },
      {
        key: "createdAt",
        header: "Created",
        render: (row) => format(new Date(row.createdAt || row.updatedAt), "dd MMM yyyy"),
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
          const allowDelete = canDelete && canDeleteRoleRecord(row);
          const allowDisable = canEdit && canDisableRoleRecord(row);
          return (
            <div className="flex gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setViewingId(row.id)}
                aria-label="View role"
                title="View details"
              >
                <Eye className="h-4 w-4" />
              </Button>
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
                  onClick={() => setCloneTarget(row)}
                  aria-label="Duplicate"
                  title="Duplicate as custom role"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              ) : null}
              {allowDisable ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setStatusTarget(row)}
                  aria-label={row.status === "active" ? "Disable" : "Enable"}
                  title={row.status === "active" ? "Disable role" : "Enable role"}
                >
                  <Ban className="h-4 w-4" />
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => requestDelete(row)}
                  disabled={!allowDelete}
                  aria-label="Delete"
                  title={
                    allowDelete
                      ? "Delete role"
                      : "Cannot delete the Super Admin role"
                  }
                >
                  <Trash2
                    className={`h-4 w-4 ${allowDelete ? "text-destructive" : "text-muted-foreground"}`}
                  />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canCreate, canDelete, canEdit, openEdit, requestDelete],
  );

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles & Access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control which roles exist, what they can do, and who is assigned to them.
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
          className="w-[140px] shrink-0"
          items={typeFilterItems}
          value={roleType ?? "all"}
          placeholder="All types"
          onValueChange={(v) => updateParams({ roleType: v === "all" ? undefined : v })}
        />
        <FilterSelect
          className="w-[150px] shrink-0"
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
              Create role
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
          description="Create a custom role or adjust your filters."
        />
      ) : (
        <DataTable columns={columns} data={result.data} />
      )}

      <RolesPagination page={result.page} pageSize={result.pageSize} total={result.total} />

      <RoleDetailDrawer
        roleId={viewingId}
        open={Boolean(viewingId)}
        onOpenChange={(next) => {
          if (!next) setViewingId(null);
        }}
      />

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit role" : "Create custom role"}
        description={
          editingSystem
            ? "System roles are protected. You can update the display name and description only."
            : editing
              ? "Update this custom role’s details and status."
              : "Create a custom role. Inheritance is optional."
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
            <Input id="role-name" placeholder="e.g. HR Manager" {...form.register("name")} />
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

          {!editingSystem ? (
            <>
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
            </>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(cloneTarget)}
        onOpenChange={(next) => {
          if (!next && !isPending) setCloneTarget(null);
        }}
        title="Duplicate role?"
        description={
          cloneTarget
            ? `Create a custom copy of “${cloneTarget.name}”, including its current permissions.`
            : undefined
        }
        contentClassName="sm:max-w-md"
        footer={
          <Button onClick={confirmClone} disabled={isPending || !cloneTarget}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Duplicate
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          The copy is always a custom role. System roles themselves are never overwritten.
        </p>
      </Modal>

      <Modal
        open={Boolean(statusTarget)}
        onOpenChange={(next) => {
          if (!next && !isPending) setStatusTarget(null);
        }}
        title={statusTarget?.status === "active" ? "Disable role?" : "Enable role?"}
        description={
          statusTarget
            ? statusTarget.status === "active"
              ? `“${statusTarget.name}” will stop granting access until you enable it again.`
              : `“${statusTarget.name}” will grant access again to assigned users.`
            : undefined
        }
        contentClassName="sm:max-w-md"
        footer={
          <Button
            variant={statusTarget?.status === "active" ? "destructive" : "default"}
            onClick={confirmStatusChange}
            disabled={isPending || !statusTarget}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {statusTarget?.status === "active" ? "Disable role" : "Enable role"}
          </Button>
        }
      >
        {statusTarget?.userCount ? (
          <p className="text-sm text-muted-foreground">
            {statusTarget.userCount} assigned user
            {statusTarget.userCount === 1 ? "" : "s"} will be affected immediately.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No users are currently assigned to this role.</p>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => {
          if (!next && !isPending) setDeleteTarget(null);
        }}
        title="Delete role?"
        description={
          deleteTarget ? `Are you sure you want to delete “${deleteTarget.name}”?` : undefined
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
                  Assigned users will lose this role. You can recreate a custom role later if needed.
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
                <li>
                  This is a <span className="font-medium text-foreground">system role</span>.
                  Deleting it can break portal access for existing users.
                </li>
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
