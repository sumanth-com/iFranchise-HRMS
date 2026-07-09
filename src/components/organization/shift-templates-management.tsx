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
import { OrgStatusBadge } from "@/components/organization/org-status-badge";
import { deleteShiftTemplateAction, saveShiftTemplateAction } from "@/lib/organization/actions";
import {
  canCreateOrganization,
  canDeleteOrganization,
  canEditOrganization,
} from "@/lib/organization/constants";
import { shiftTemplateFormSchema } from "@/lib/validations/organization";
import type { ShiftTemplateListItem } from "@/types/organization";
import type { RecordStatus } from "@/types/auth";

type ShiftTemplateFormInput = z.input<typeof shiftTemplateFormSchema>;

type Props = {
  items: ShiftTemplateListItem[];
  permissionCodes: string[];
};

const emptyForm: ShiftTemplateFormInput = {
  name: "",
  startTime: "09:00",
  endTime: "18:00",
  breakDurationMinutes: 60,
  graceTimeMinutes: 15,
  minimumHours: 8,
  halfDayHours: 4,
  status: "active",
};

export function ShiftTemplatesManagement({ items, permissionCodes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftTemplateListItem | null>(null);

  const canCreate = canCreateOrganization(permissionCodes);
  const canEdit = canEditOrganization(permissionCodes);
  const canDelete = canDeleteOrganization(permissionCodes);

  const form = useForm<ShiftTemplateFormInput>({
    resolver: zodResolver(shiftTemplateFormSchema) as never,
    defaultValues: emptyForm,
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    form.reset(emptyForm);
    setOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (item: ShiftTemplateListItem) => {
      setEditing(item);
      form.reset({
        name: item.name,
        startTime: item.startTime,
        endTime: item.endTime,
        breakDurationMinutes: item.breakDurationMinutes,
        graceTimeMinutes: item.graceTimeMinutes,
        minimumHours: item.minimumHours,
        halfDayHours: item.halfDayHours,
        status: item.status,
      });
      setOpen(true);
    },
    [form],
  );

  function onSave(values: ShiftTemplateFormInput) {
    startTransition(async () => {
      const res = await saveShiftTemplateAction(values, editing?.id);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? "Shift template updated" : "Shift template created");
      setOpen(false);
      router.refresh();
    });
  }

  const onDelete = useCallback(
    (item: ShiftTemplateListItem) => {
      if (!window.confirm(`Delete shift template "${item.name}"?`)) return;
      startTransition(async () => {
        const res = await deleteShiftTemplateAction(item.id);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Shift template deleted");
        router.refresh();
      });
    },
    [router],
  );

  const columns = useMemo<
    DataTableColumn<ShiftTemplateListItem & Record<string, unknown>>[]
  >(
    () => [
      {
        key: "name",
        header: "Shift",
        render: (row) => <p className="font-medium">{row.name}</p>,
      },
      {
        key: "startTime",
        header: "Timing",
        render: (row) => `${row.startTime} – ${row.endTime}`,
      },
      {
        key: "breakDurationMinutes",
        header: "Break (min)",
        render: (row) => row.breakDurationMinutes,
      },
      {
        key: "graceTimeMinutes",
        header: "Grace (min)",
        render: (row) => row.graceTimeMinutes,
      },
      {
        key: "minimumHours",
        header: "Min Hours",
        render: (row) => row.minimumHours,
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
          <h1 className="text-2xl font-semibold tracking-tight">Shift Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define standard shift timings and attendance rules.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Shift Template
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No shift templates"
          description="Create shift templates for attendance tracking."
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Shift Template" : "Add Shift Template"}
        contentClassName="sm:max-w-lg"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Shift
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" {...form.register("startTime")} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" {...form.register("endTime")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Break Duration (minutes)</Label>
              <Input type="number" min={0} {...form.register("breakDurationMinutes")} />
            </div>
            <div className="space-y-2">
              <Label>Grace Time (minutes)</Label>
              <Input type="number" min={0} {...form.register("graceTimeMinutes")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Minimum Hours</Label>
              <Input type="number" min={0} step={0.5} {...form.register("minimumHours")} />
            </div>
            <div className="space-y-2">
              <Label>Half Day Hours</Label>
              <Input type="number" min={0} step={0.5} {...form.register("halfDayHours")} />
            </div>
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
