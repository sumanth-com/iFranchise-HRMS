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
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toLookupSelectItems, withSelectOption } from "@/components/payroll/select-utils";
import { Label } from "@/components/ui/label";
import { OrgPagination } from "@/components/organization/org-pagination";
import { OrgStatusBadge } from "@/components/organization/org-status-badge";
import { deleteWorkLocationAction, saveWorkLocationAction } from "@/lib/organization/actions";
import {
  canCreateOrganization,
  canDeleteOrganization,
  canEditOrganization,
} from "@/lib/organization/constants";
import { WORKING_DAYS, workLocationFormSchema } from "@/lib/validations/organization";
import type { LookupOption } from "@/types/employee";
import type { WorkLocationListItem, WorkLocationListResult } from "@/types/organization";
import type { RecordStatus } from "@/types/auth";

type WorkLocationFormInput = z.input<typeof workLocationFormSchema>;

type Props = {
  result: WorkLocationListResult;
  branches: LookupOption[];
  permissionCodes: string[];
  search: string;
  status?: RecordStatus;
  embedded?: boolean;
  sectionScrollable?: boolean;
  pageParam?: string;
  searchParam?: string;
  statusParam?: string;
};

const emptyForm: WorkLocationFormInput = {
  name: "",
  branchId: "",
  workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  officeStartTime: "09:00",
  officeEndTime: "18:00",
  latitude: null,
  longitude: null,
  status: "active",
};

export function WorkLocationsManagement({
  result,
  branches,
  permissionCodes,
  search,
  status,
  embedded = false,
  sectionScrollable = false,
  pageParam = "page",
  searchParam = "search",
  statusParam = "status",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkLocationListItem | null>(null);
  const [deleting, setDeleting] = useState<WorkLocationListItem | null>(null);
  const [searchInput, setSearchInput] = useState(search);
  const [statusFilter, setStatusFilter] = useState<string>(status ?? "all");

  const canCreate = canCreateOrganization(permissionCodes);
  const canEdit = canEditOrganization(permissionCodes);
  const canDelete = canDeleteOrganization(permissionCodes);

  const branchItems = useMemo(() => toLookupSelectItems(branches), [branches]);

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
        (loc) =>
          loc.name.toLowerCase().includes(q) ||
          (loc.branchName && loc.branchName.toLowerCase().includes(q)),
      );
    }
    if (statusFilter && statusFilter !== "all") {
      items = items.filter((loc) => loc.status === statusFilter);
    }
    return items;
  }, [result.data, searchInput, statusFilter]);

  const form = useForm<WorkLocationFormInput>({
    resolver: zodResolver(workLocationFormSchema) as never,
    defaultValues: emptyForm,
  });

  const workingDays = form.watch("workingDays") ?? [];

type WorkingDay = WorkLocationFormInput["workingDays"][number];

  function toggleWorkingDay(day: WorkingDay) {
    const current = (form.getValues("workingDays") ?? []) as WorkingDay[];
    if (current.includes(day)) {
      form.setValue(
        "workingDays",
        current.filter((d) => d !== day),
        { shouldValidate: true },
      );
    } else {
      form.setValue("workingDays", [...current, day], { shouldValidate: true });
    }
  }

  const openCreate = useCallback(() => {
    setEditing(null);
    form.reset({
      ...emptyForm,
      branchId: branches[0]?.id ?? "",
    });
    setOpen(true);
  }, [branches, form]);

  const openEdit = useCallback(
    (item: WorkLocationListItem) => {
      setEditing(item);
      form.reset({
        name: item.name,
        branchId: item.branchId,
        workingDays: item.workingDays as WorkingDay[],
        officeStartTime: item.officeStartTime,
        officeEndTime: item.officeEndTime,
        latitude: item.latitude,
        longitude: item.longitude,
        status: item.status,
      });
      setOpen(true);
    },
    [form],
  );

  function onSave(values: WorkLocationFormInput) {
    startTransition(async () => {
      const res = await saveWorkLocationAction(
        {
          ...values,
          latitude: values.latitude || null,
          longitude: values.longitude || null,
        },
        editing?.id,
      );
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? "Work location updated" : "Work location created");
      setOpen(false);
      router.refresh();
    });
  }

  const requestDelete = useCallback((item: WorkLocationListItem) => {
    setDeleting(item);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleting) return;
    startDeleteTransition(async () => {
      const res = await deleteWorkLocationAction(deleting.id);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Work location deleted");
      setDeleting(null);
      router.refresh();
    });
  }, [deleting, router]);

  const columns = useMemo<
    DataTableColumn<WorkLocationListItem & Record<string, unknown>>[]
  >(
    () => [
      {
        key: "name",
        header: "Location",
        className: "text-left",
        render: (row) => (
          <div className="text-left">
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.branchName ?? "—"}</p>
          </div>
        ),
      },
      {
        key: "workingDays",
        header: "Working Days",
        render: (row) => row.workingDays.length,
      },
      {
        key: "officeStartTime",
        header: "Hours",
        render: (row) => `${row.officeStartTime} – ${row.officeEndTime}`,
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
            <h1 className="text-2xl font-semibold tracking-tight">Work Locations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure office locations, working days, and timings.
            </p>
          </div>
          {canCreate ? (
            <Button onClick={openCreate} disabled={branches.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          ) : null}
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Work Locations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure office locations, working days, and timings per branch.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations…"
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
            disabled={branches.length === 0}
            className="h-9 shrink-0 sm:ml-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Location
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
          title="No work locations found"
          description="Add a work location or adjust your filters."
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

      <OrgPagination
        page={result.page}
        pageSize={result.pageSize}
        total={filteredData.length}
        pageParam={pageParam}
      />

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Work Location" : "Add Work Location"}
        contentClassName="sm:max-w-2xl"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Location
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
              <Label>Branch</Label>
              <LabeledSelect
                items={branchItems}
                value={form.watch("branchId")}
                onValueChange={(v) => form.setValue("branchId", v)}
                placeholder="Select branch"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Working Days</Label>
            <div className="flex flex-wrap gap-3">
              {WORKING_DAYS.map((day) => (
                <label key={day.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded border"
                    checked={workingDays.includes(day.value)}
                    onChange={() => toggleWorkingDay(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Office Start Time</Label>
              <Input type="time" {...form.register("officeStartTime")} />
            </div>
            <div className="space-y-2">
              <Label>Office End Time</Label>
              <Input type="time" {...form.register("officeEndTime")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input type="number" step="any" {...form.register("latitude")} />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input type="number" step="any" {...form.register("longitude")} />
            </div>
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
      </Modal>

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletePending) setDeleting(null);
        }}
        title="Delete work location?"
        description={
          deleting ? `This will remove "${deleting.name}" from your organization.` : undefined
        }
        contentClassName="sm:max-w-md"
        footer={
          <Button
            variant="destructive"
            disabled={isDeletePending || !deleting}
            onClick={confirmDelete}
          >
            {isDeletePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete location
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          This action cannot be undone. The work location will be removed from lists and
          reports.
        </p>
      </Modal>
    </div>
  );
}
