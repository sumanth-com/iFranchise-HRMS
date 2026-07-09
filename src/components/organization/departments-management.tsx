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
import { FilterSelect } from "@/components/common/filter-select";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { OptionalEntitySelect } from "@/components/common/optional-entity-select";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { withSelectOption } from "@/components/payroll/select-utils";
import { Label } from "@/components/ui/label";
import { OrgExportButtons } from "@/components/organization/org-export-buttons";
import { OrgPagination } from "@/components/organization/org-pagination";
import { OrgStatusBadge } from "@/components/organization/org-status-badge";
import { deleteDepartmentAction, saveDepartmentAction } from "@/lib/organization/actions";
import {
  canCreateOrganization,
  canDeleteOrganization,
  canEditOrganization,
} from "@/lib/organization/constants";
import { departmentFormSchema } from "@/lib/validations/organization";
import type { LookupOption } from "@/types/employee";
import type { DepartmentListItem, DepartmentListResult } from "@/types/organization";
import type { RecordStatus } from "@/types/auth";

type DepartmentFormInput = z.input<typeof departmentFormSchema>;

type Props = {
  result: DepartmentListResult;
  employees: LookupOption[];
  departments: LookupOption[];
  branches: LookupOption[];
  permissionCodes: string[];
  search: string;
  status?: RecordStatus;
};

const emptyForm: DepartmentFormInput = {
  name: "",
  code: "",
  description: "",
  departmentHeadId: null,
  parentDepartmentId: null,
  branchId: null,
  status: "active",
};

export function DepartmentsManagement({
  result,
  employees,
  departments,
  branches,
  permissionCodes,
  search,
  status,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentListItem | null>(null);

  const canCreate = canCreateOrganization(permissionCodes);
  const canEdit = canEditOrganization(permissionCodes);
  const canDelete = canDeleteOrganization(permissionCodes);

  const parentOptions = useMemo(
    () => departments.filter((d) => d.id !== editing?.id),
    [departments, editing?.id],
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

  const form = useForm<DepartmentFormInput>({
    resolver: zodResolver(departmentFormSchema) as never,
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
    (item: DepartmentListItem) => {
      setEditing(item);
      form.reset({
        name: item.name,
        code: item.code,
        description: item.description ?? "",
        departmentHeadId: item.departmentHeadId,
        parentDepartmentId: item.parentDepartmentId,
        branchId: item.branchId,
        status: item.status,
      });
      setOpen(true);
    },
    [form],
  );

  function onSave(values: DepartmentFormInput) {
    startTransition(async () => {
      const res = await saveDepartmentAction(
        {
          ...values,
          description: values.description || null,
          departmentHeadId: values.departmentHeadId || null,
          parentDepartmentId: values.parentDepartmentId || null,
          branchId: values.branchId || null,
        },
        editing?.id,
      );
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? "Department updated" : "Department created");
      setOpen(false);
      router.refresh();
    });
  }

  const onDelete = useCallback(
    (item: DepartmentListItem) => {
      const warning =
        item.employeeCount > 0
          ? ` This department has ${item.employeeCount} employee(s) assigned.`
          : "";
      if (!window.confirm(`Delete department "${item.name}"?${warning}`)) return;
      startTransition(async () => {
        const res = await deleteDepartmentAction(item.id);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Department deleted");
        router.refresh();
      });
    },
    [router],
  );

  const columns = useMemo<
    DataTableColumn<DepartmentListItem & Record<string, unknown>>[]
  >(
    () => [
      {
        key: "name",
        header: "Department",
        render: (row) => (
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.code}</p>
          </div>
        ),
      },
      {
        key: "departmentHeadName",
        header: "Head",
        render: (row) => row.departmentHeadName ?? "—",
      },
      {
        key: "parentDepartmentName",
        header: "Parent",
        render: (row) => row.parentDepartmentName ?? "—",
      },
      {
        key: "branchName",
        header: "Branch",
        render: (row) => row.branchName ?? "—",
      },
      {
        key: "employeeCount",
        header: "Employees",
        render: (row) => row.employeeCount,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <OrgStatusBadge status={row.status} />,
      },
      {
        key: "updatedAt",
        header: "Updated",
        render: (row) => format(new Date(row.updatedAt), "dd MMM yyyy"),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
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
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, canEdit, onDelete, openEdit],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize teams and reporting structure by department.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrgExportButtons entity="departments" />
          {canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments…"
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
          title="No departments found"
          description="Add a department or adjust your filters."
        />
      ) : (
        <DataTable columns={columns} data={result.data} />
      )}

      <OrgPagination page={result.page} pageSize={result.pageSize} total={result.total} />

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Department" : "Add Department"}
        contentClassName="sm:max-w-2xl"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Department
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
              <Input {...form.register("code")} />
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
              <Label>Department Head</Label>
              <OptionalEntitySelect
                options={employees}
                value={form.watch("departmentHeadId")}
                onValueChange={(v) => form.setValue("departmentHeadId", v)}
                placeholder="Select employee"
                useEmployeeLabels
              />
            </div>
            <div className="space-y-2">
              <Label>Parent Department</Label>
              <OptionalEntitySelect
                options={parentOptions}
                value={form.watch("parentDepartmentId")}
                onValueChange={(v) => form.setValue("parentDepartmentId", v)}
                placeholder="None"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Branch</Label>
              <OptionalEntitySelect
                options={branches}
                value={form.watch("branchId")}
                onValueChange={(v) => form.setValue("branchId", v)}
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
        </div>
      </Modal>
    </>
  );
}
