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
  DATA_TABLE_SPLIT_SCROLL_MAX_HEIGHT,
  DataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { FilterSelect } from "@/components/common/filter-select";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { OptionalEntitySelect } from "@/components/common/optional-entity-select";
import { PhoneInput } from "@/components/common/phone-input";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { withSelectOption } from "@/components/payroll/select-utils";
import { SearchableSelect } from "@/components/common/searchable-select";
import { Label } from "@/components/ui/label";
import { OrgPagination } from "@/components/organization/org-pagination";
import { OrgStatusBadge } from "@/components/organization/org-status-badge";
import { COUNTRIES, INDIAN_STATES, STATE_DISTRICTS } from "@/lib/geo/india";
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
  embedded?: boolean;
  sectionScrollable?: boolean;
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
  country: "India",
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
  embedded = false,
  sectionScrollable = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchListItem | null>(null);
  const [deleting, setDeleting] = useState<BranchListItem | null>(null);
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
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          (b.location && b.location.toLowerCase().includes(q)) ||
          (b.city && b.city.toLowerCase().includes(q)),
      );
    }
    if (statusFilter && statusFilter !== "all") {
      items = items.filter((b) => b.status === statusFilter);
    }
    return items;
  }, [result.data, searchInput, statusFilter]);

  const form = useForm<BranchFormInput>({
    resolver: zodResolver(branchFormSchema) as never,
    defaultValues: emptyForm,
  });

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
        country: item.country === "IN" ? "India" : item.country,
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

  const requestDelete = useCallback((item: BranchListItem) => {
    setDeleting(item);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleting) return;
    startDeleteTransition(async () => {
      const res = await deleteBranchAction(deleting.id);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Branch deleted");
      setDeleting(null);
      router.refresh();
    });
  }, [deleting, router]);

  const columns = useMemo<DataTableColumn<BranchListItem & Record<string, unknown>>[]>(
    () => [
      {
        key: "name",
        header: "Branch",
        className: "text-left",
        render: (row) => (
          <div className="text-left">
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
    [canDelete, canEdit, openEdit, requestDelete],
  );

  return (
    <div className="space-y-4">
      {!embedded ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Branches</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage company branches and office locations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canCreate ? (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Branch
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <h2 className="text-lg font-semibold tracking-tight">Branches</h2>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search branches…"
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
          <Button
            onClick={openCreate}
            className="h-9 shrink-0 sm:ml-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Branch
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
          title="No branches found"
          description="Add a branch or adjust your filters."
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          align="center"
          scrollable={sectionScrollable}
          maxHeightClass={DATA_TABLE_SPLIT_SCROLL_MAX_HEIGHT}
        />
      )}

      <OrgPagination page={result.page} pageSize={result.pageSize} total={filteredData.length} />

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(11rem,1fr)_minmax(11rem,1fr)_minmax(7rem,0.7fr)_minmax(7rem,0.7fr)]">
            <div className="space-y-2">
              <Label>State</Label>
              <SearchableSelect
                options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                value={form.watch("state") || null}
                onValueChange={(v) => {
                  form.setValue("state", v ?? "", { shouldValidate: true });
                  form.setValue("city", "");
                }}
                placeholder="Search state…"
                allowNone={false}
              />
            </div>
            <div className="space-y-2">
              <Label>City / District</Label>
              <SearchableSelect
                options={(STATE_DISTRICTS[form.watch("state") || ""] ?? []).map((d: string) => ({ value: d, label: d }))}
                value={form.watch("city") || null}
                onValueChange={(v) => form.setValue("city", v ?? "", { shouldValidate: true })}
                placeholder="Search city…"
                allowNone={false}
                emptyMessage={form.watch("state") ? "No districts found" : "Select a state first"}
              />
            </div>
            <div className="space-y-2">
              <Label>Postal Code</Label>
              <Input {...form.register("postalCode")} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <SearchableSelect
                options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                value={form.watch("country") || null}
                onValueChange={(v) => form.setValue("country", v ?? "India", { shouldValidate: true })}
                placeholder="Select country…"
                allowNone={false}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone</Label>
              <PhoneInput
                value={form.watch("phone") ?? ""}
                onChange={(value) => form.setValue("phone", value, { shouldValidate: true })}
                error={form.formState.errors.phone?.message}
              />
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

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletePending) setDeleting(null);
        }}
        title="Delete branch?"
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
            Delete branch
          </Button>
        }
      >
        {deleting?.employeeCount && deleting.employeeCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            {deleting.employeeCount} employee(s) are assigned to this branch. They will be
            unassigned when you delete it.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The branch will be removed from lists and reports.
          </p>
        )}
      </Modal>
    </div>
  );
}
