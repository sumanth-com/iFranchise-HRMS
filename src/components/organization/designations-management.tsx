"use client";

import { format } from "date-fns";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { deleteDesignationAction, saveDesignationAction } from "@/lib/organization/actions";
import {
  canCreateOrganization,
  canDeleteOrganization,
  canEditOrganization,
} from "@/lib/organization/constants";
import { designationFormSchema } from "@/lib/validations/organization";
import type { LookupOption } from "@/types/employee";
import type { DesignationListItem, DesignationListResult } from "@/types/organization";
import type { RecordStatus } from "@/types/auth";

type DesignationFormInput = z.input<typeof designationFormSchema>;

type Props = {
  result: DesignationListResult;
  departments: LookupOption[];
  employmentTypes: LookupOption[];
  permissionCodes: string[];
  search: string;
  status?: RecordStatus;
};

const emptyForm: DesignationFormInput = {
  title: "",
  departmentId: null,
  employmentTypeId: null,
  description: "",
  status: "active",
};

export function DesignationsManagement({
  result,
  departments,
  employmentTypes,
  permissionCodes,
  search,
  status,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DesignationListItem | null>(null);
  const [deleting, setDeleting] = useState<DesignationListItem | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const form = useForm<DesignationFormInput>({
    resolver: zodResolver(designationFormSchema) as never,
    defaultValues: emptyForm,
  });

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

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

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const trimmed = value.trim();
      updateParams({ search: trimmed || undefined });
    }, 300);
  }

  const openCreate = useCallback(() => {
    setEditing(null);
    form.reset(emptyForm);
    setOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (item: DesignationListItem) => {
      setEditing(item);
      form.reset({
        title: item.title,
        departmentId: item.departmentId,
        employmentTypeId: item.employmentTypeId,
        description: item.description ?? "",
        status: item.status,
      });
      setOpen(true);
    },
    [form],
  );

  function onSave(values: DesignationFormInput) {
    startTransition(async () => {
      const res = await saveDesignationAction(
        {
          ...values,
          departmentId: values.departmentId || null,
          employmentTypeId: values.employmentTypeId || null,
          description: values.description || null,
        },
        editing?.id,
      );
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? "Designation updated" : "Designation created");
      setOpen(false);
      router.refresh();
    });
  }

  const requestDelete = useCallback((item: DesignationListItem) => {
    setDeleting(item);
  }, []);

  function confirmDelete() {
    if (!deleting) return;
    startDeleteTransition(async () => {
      const res = await deleteDesignationAction(deleting.id);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Designation deleted");
      setDeleting(null);
      router.refresh();
    });
  }

  const columns = useMemo<
    DataTableColumn<DesignationListItem & Record<string, unknown>>[]
  >(
    () => [
      {
        key: "title",
        header: "Designation",
        className: "text-left",
        render: (row) => <p className="font-medium text-left">{row.title}</p>,
      },
      {
        key: "departmentName",
        header: "Department",
        render: (row) => row.departmentName ?? "—",
      },
      {
        key: "employmentTypeName",
        header: "Employment Type",
        render: (row) => row.employmentTypeName ?? "—",
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
        <h1 className="text-2xl font-semibold tracking-tight">Designations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define job titles and employment types across departments.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search designations…"
            className="h-9 pl-9"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <FilterSelect
          items={statusFilterItems}
          value={status ?? "all"}
          placeholder="All statuses"
          className="sm:w-44"
          triggerClassName="h-9"
          onValueChange={(v) => updateParams({ status: v === "all" ? undefined : v })}
        />
        {canCreate ? (
          <Button onClick={openCreate} className="h-9 shrink-0 sm:ml-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Designation
          </Button>
        ) : null}
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      ) : null}

      {result.data.length === 0 ? (
        <EmptyState
          title={search.trim() ? "No matching designations" : "No designations found"}
          description={
            search.trim()
              ? `Nothing matches "${search.trim()}". Try another spelling or clear the search.`
              : "Add a designation or adjust your filters."
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={result.data}
          align="center"
          scrollable
          maxHeightClass={DATA_TABLE_SCROLL_MAX_HEIGHT}
        />
      )}

      {result.total > result.pageSize ? (
        <OrgPagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
        />
      ) : null}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Designation" : "Add Designation"}
        contentClassName="sm:max-w-lg"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Designation
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...form.register("title")} />
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <OptionalEntitySelect
                options={departments}
                value={form.watch("departmentId")}
                onValueChange={(v) => form.setValue("departmentId", v)}
                placeholder="None"
              />
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <OptionalEntitySelect
                options={employmentTypes}
                value={form.watch("employmentTypeId")}
                onValueChange={(v) => form.setValue("employmentTypeId", v)}
                placeholder="None"
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
        </div>
      </Modal>

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletePending) setDeleting(null);
        }}
        title="Delete designation?"
        description={
          deleting
            ? `This will remove "${deleting.title}" from your organization.`
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
            Delete designation
          </Button>
        }
      >
        {deleting && deleting.employeeCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            {deleting.employeeCount} employee(s) are assigned to this designation. They will be
            unassigned when you delete it.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The designation will be removed from lists and reports.
          </p>
        )}
      </Modal>
    </>
  );
}
