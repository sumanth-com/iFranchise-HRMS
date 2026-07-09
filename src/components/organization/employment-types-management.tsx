"use client";

import { format } from "date-fns";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { Label } from "@/components/ui/label";
import { OrgExportButtons } from "@/components/organization/org-export-buttons";
import { OrgStatusBadge } from "@/components/organization/org-status-badge";
import {
  deleteEmploymentTypeAction,
  saveEmploymentTypeAction,
} from "@/lib/organization/actions";
import {
  canCreateOrganization,
  canDeleteOrganization,
  canEditOrganization,
} from "@/lib/organization/constants";
import { employmentTypeFormSchema } from "@/lib/validations/organization";
import type { EmploymentTypeListItem } from "@/types/organization";
import type { RecordStatus } from "@/types/auth";

type EmploymentTypeFormInput = z.input<typeof employmentTypeFormSchema>;

type Props = {
  items: EmploymentTypeListItem[];
  permissionCodes: string[];
};

const emptyForm: EmploymentTypeFormInput = {
  name: "",
  code: "",
  description: "",
  isFullTime: true,
  defaultHoursPerWeek: 40,
  status: "active",
};

export function EmploymentTypesManagement({ items, permissionCodes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmploymentTypeListItem | null>(null);

  const canCreate = canCreateOrganization(permissionCodes);
  const canEdit = canEditOrganization(permissionCodes);
  const canDelete = canDeleteOrganization(permissionCodes);

  const form = useForm<EmploymentTypeFormInput>({
    resolver: zodResolver(employmentTypeFormSchema) as never,
    defaultValues: emptyForm,
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    form.reset(emptyForm);
    setOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (item: EmploymentTypeListItem) => {
      setEditing(item);
      form.reset({
        name: item.name,
        code: item.code,
        description: item.description ?? "",
        isFullTime: item.isFullTime,
        defaultHoursPerWeek: item.defaultHoursPerWeek,
        status: item.status,
      });
      setOpen(true);
    },
    [form],
  );

  function onSave(values: EmploymentTypeFormInput) {
    startTransition(async () => {
      const res = await saveEmploymentTypeAction(
        {
          ...values,
          description: values.description || null,
        },
        editing?.id,
      );
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? "Employment type updated" : "Employment type created");
      setOpen(false);
      router.refresh();
    });
  }

  const onDelete = useCallback(
    (item: EmploymentTypeListItem) => {
      if (item.employeeCount > 0) {
        toast.error(
          `Cannot delete employment type with ${item.employeeCount} assigned employee(s)`,
        );
        return;
      }
      if (!window.confirm(`Delete employment type "${item.name}"?`)) return;
      startTransition(async () => {
        const res = await deleteEmploymentTypeAction(item.id);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Employment type deleted");
        router.refresh();
      });
    },
    [router],
  );

  const columns = useMemo<
    DataTableColumn<EmploymentTypeListItem & Record<string, unknown>>[]
  >(
    () => [
      {
        key: "name",
        header: "Employment Type",
        render: (row) => (
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.code}</p>
          </div>
        ),
      },
      {
        key: "isFullTime",
        header: "Full Time",
        render: (row) => (row.isFullTime ? "Yes" : "No"),
      },
      {
        key: "defaultHoursPerWeek",
        header: "Hours/Week",
        render: (row) => row.defaultHoursPerWeek,
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
                disabled={row.employeeCount > 0}
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
          <h1 className="text-2xl font-semibold tracking-tight">Employment Types</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure full-time, part-time, and contract employment categories.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrgExportButtons entity="employment-types" />
          {canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Employment Type
            </Button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No employment types"
          description="Add employment types to classify employees."
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Employment Type" : "Add Employment Type"}
        contentClassName="sm:max-w-lg"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded border"
              checked={form.watch("isFullTime")}
              onChange={(e) => form.setValue("isFullTime", e.target.checked)}
            />
            Full-time employment
          </label>
          <div className="space-y-2">
            <Label>Default Hours Per Week</Label>
            <Input type="number" min={1} step={0.5} {...form.register("defaultHoursPerWeek")} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(v) => v && form.setValue("status", v as RecordStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Modal>
    </>
  );
}
