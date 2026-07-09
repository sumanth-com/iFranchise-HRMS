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
import { deleteBranchAction, saveBranchAction } from "@/lib/organization/actions";
import {
  canCreateOrganization,
  canDeleteOrganization,
  canEditOrganization,
} from "@/lib/organization/constants";
import { branchFormSchema } from "@/lib/validations/organization";
import type { LookupOption } from "@/types/employee";
import type { BranchListItem, BranchListResult } from "@/types/organization";
import type { RecordStatus } from "@/types/auth";

type BranchFormInput = z.input<typeof branchFormSchema>;

type Props = {
  result: BranchListResult;
  employees: LookupOption[];
  permissionCodes: string[];
  search: string;
  status?: RecordStatus;
};

const emptyForm: BranchFormInput = {
  code: "",
  name: "",
  location: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
  phone: "",
  email: "",
  branchHeadId: null,
  isHeadOffice: false,
  status: "active",
};

export function BranchesManagement({
  result,
  employees,
  permissionCodes,
  search,
  status,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchListItem | null>(null);

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

  const form = useForm<BranchFormInput>({
    resolver: zodResolver(branchFormSchema) as never,
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
    (item: BranchListItem) => {
      setEditing(item);
      form.reset({
        code: item.code,
        name: item.name,
        location: item.location ?? "",
        addressLine1: item.addressLine1 ?? "",
        addressLine2: item.addressLine2 ?? "",
        city: item.city ?? "",
        state: item.state ?? "",
        postalCode: item.postalCode ?? "",
        country: item.country,
        phone: item.phone ?? "",
        email: item.email ?? "",
        branchHeadId: item.branchHeadId,
        isHeadOffice: item.isHeadOffice,
        status: item.status,
      });
      setOpen(true);
    },
    [form],
  );

  function onSave(values: BranchFormInput) {
    startTransition(async () => {
      const res = await saveBranchAction(
        {
          ...values,
          location: values.location || null,
          addressLine1: values.addressLine1 || null,
          addressLine2: values.addressLine2 || null,
          city: values.city || null,
          state: values.state || null,
          postalCode: values.postalCode || null,
          phone: values.phone || null,
          email: values.email || null,
          branchHeadId: values.branchHeadId || null,
        },
        editing?.id,
      );
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? "Branch updated" : "Branch created");
      setOpen(false);
      router.refresh();
    });
  }

  const onDelete = useCallback(
    (item: BranchListItem) => {
      const warning =
        item.employeeCount > 0
          ? ` This branch has ${item.employeeCount} employee(s) assigned.`
          : "";
      if (!window.confirm(`Delete branch "${item.name}"?${warning}`)) return;
      startTransition(async () => {
        const res = await deleteBranchAction(item.id);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Branch deleted");
        router.refresh();
      });
    },
    [router],
  );

  const columns = useMemo<DataTableColumn<BranchListItem & Record<string, unknown>>[]>(
    () => [
      {
        key: "name",
        header: "Branch",
        render: (row) => (
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.code}
              {row.isHeadOffice ? " · Head office" : ""}
            </p>
          </div>
        ),
      },
      {
        key: "location",
        header: "Location",
        render: (row) => (
          <div>
            <p className="text-sm">{row.location ?? row.city ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {[row.city, row.state].filter(Boolean).join(", ") || ""}
            </p>
          </div>
        ),
      },
      {
        key: "branchHeadName",
        header: "Branch Head",
        render: (row) => row.branchHeadName ?? "—",
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
          <h1 className="text-2xl font-semibold tracking-tight">Branches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage company branches and office locations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrgExportButtons entity="branches" />
          {canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Branch
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search branches…"
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
          title="No branches found"
          description="Add a branch or adjust your filters."
        />
      ) : (
        <DataTable columns={columns} data={result.data} />
      )}

      <OrgPagination page={result.page} pageSize={result.pageSize} total={result.total} />

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Branch" : "Add Branch"}
        contentClassName="sm:max-w-2xl"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Branch
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input {...form.register("code")} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input {...form.register("location")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Address Line 1</Label>
              <Input {...form.register("addressLine1")} />
            </div>
            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input {...form.register("addressLine2")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input {...form.register("city")} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input {...form.register("state")} />
            </div>
            <div className="space-y-2">
              <Label>Postal Code</Label>
              <Input {...form.register("postalCode")} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input {...form.register("country")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...form.register("phone")} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...form.register("email")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Branch Head</Label>
              <OptionalEntitySelect
                options={employees}
                value={form.watch("branchHeadId")}
                onValueChange={(v) => form.setValue("branchHeadId", v)}
                placeholder="Select employee"
                useEmployeeLabels
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
              className="rounded border"
              checked={form.watch("isHeadOffice")}
              onChange={(e) => form.setValue("isHeadOffice", e.target.checked)}
            />
            Head office
          </label>
        </div>
      </Modal>
    </>
  );
}
