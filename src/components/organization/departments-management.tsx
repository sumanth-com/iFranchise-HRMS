"use client";

import { format } from "date-fns";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/common/button";
import {
  DATA_TABLE_SCROLL_MAX_HEIGHT,
  DataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { FilterSelect } from "@/components/common/filter-select";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { OptionalEntitySelect } from "@/components/common/optional-entity-select";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { withSelectOption } from "@/components/payroll/select-utils";
import { Label } from "@/components/ui/label";
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
  branches: LookupOption[];
  permissionCodes: string[];
  search: string;
  status?: RecordStatus;
};

const emptyForm: DepartmentFormInput = {
  name: "",
  description: "",
  departmentHeadId: null,
  parentDepartmentId: null,
  branchId: null,
  status: "active",
};

export function DepartmentsManagement({
  result,
  employees,
  branches,
  permissionCodes,
  search,
  status,
}: Props) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentListItem | null>(null);
  const [deleting, setDeleting] = useState<DepartmentListItem | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);
  const [statusFilter, setStatusFilter] = useState<string>(status ?? "all");

  const canCreate = canCreateOrganization(permissionCodes);
  const canEdit = canEditOrganization(permissionCodes);
  const canDelete = canDeleteOrganization(permissionCodes);

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

  const filteredData = useMemo(() => {
    let items = result.data;
    const q = searchInput.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.departmentHeadName && d.departmentHeadName.toLowerCase().includes(q)) ||
          (d.branchName && d.branchName.toLowerCase().includes(q)),
      );
    }
    if (statusFilter && statusFilter !== "all") {
      items = items.filter((d) => d.status === statusFilter);
    }
    return items;
  }, [result.data, searchInput, statusFilter]);

  const form = useForm<DepartmentFormInput>({
    resolver: zodResolver(departmentFormSchema) as never,
    defaultValues: emptyForm,
  });

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
        description: item.description ?? "",
        departmentHeadId: item.departmentHeadId,
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
          parentDepartmentId: null,
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

  const requestDelete = useCallback((item: DepartmentListItem) => {
    setDeleting(item);
  }, []);

  function confirmDelete() {
    if (!deleting) return;
    startDeleteTransition(async () => {
      const res = await deleteDepartmentAction(deleting.id);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Department deleted");
      setDeleting(null);
      router.refresh();
    });
  }

  const columns = useMemo<
    DataTableColumn<DepartmentListItem & Record<string, unknown>>[]
  >(
    () => [
      {
        key: "name",
        header: "Department",
        className: "text-left",
        render: (row) => <p className="font-medium text-left">{row.name}</p>,
      },
      {
        key: "departmentHeadName",
        header: "Head",
        render: (row) => row.departmentHeadName ?? "—",
      },
      {
        key: "branchName",
        header: "Branch",
        render: (row) => row.branchName ?? "—",
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
          <div className="flex justify-center gap-1">
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
                onClick={() => requestDelete(row)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, canEdit, requestDelete, openEdit],
  );

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize teams and reporting structure by department.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments…"
            className="h-9 pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <FilterSelect
          items={statusFilterItems}
          value={statusFilter}
          placeholder="All statuses"
          className="sm:w-44"
          triggerClassName="h-9"
          onValueChange={(v) => setStatusFilter(v)}
        />
        {canCreate ? (
          <Button onClick={openCreate} className="h-9 shrink-0 sm:ml-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        ) : null}
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      ) : null}

      {filteredData.length === 0 ? (
        <EmptyState
          title={searchInput.trim() ? "No matching departments" : "No departments found"}
          description={
            searchInput.trim()
              ? `Nothing matches "${searchInput.trim()}". Try another spelling or clear the search.`
              : "Add a department or adjust your filters."
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          align="center"
          scrollable
          maxHeightClass={DATA_TABLE_SCROLL_MAX_HEIGHT}
        />
      )}

      <OrgPagination page={result.page} pageSize={result.pageSize} total={filteredData.length} />

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
              <Label>Status</Label>
              <LabeledSelect
                items={statusItems}
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as RecordStatus)}
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
              <Label>Branch</Label>
              <OptionalEntitySelect
                options={branches}
                value={form.watch("branchId")}
                onValueChange={(v) => form.setValue("branchId", v)}
                placeholder="None"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletePending) setDeleting(null);
        }}
        title="Delete department?"
        description={
          deleting
            ? `This will remove "${deleting.name}" from your organization.`
            : undefined
        }
        contentClassName="sm:max-w-md"
        footer={
          <Button
            variant="destructive"
            disabled={isDeletePending || !deleting}
            onClick={confirmDelete}
          >
            {isDeletePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete department
          </Button>
        }
      >
        {deleting && deleting.employeeCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            {deleting.employeeCount} employee(s) are assigned to this department. They will be
            unassigned when you delete it.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The department will be removed from lists and reports.
          </p>
        )}
      </Modal>
    </>
  );
}
