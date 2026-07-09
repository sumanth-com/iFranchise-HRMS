"use client";

import {
  addDays,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
} from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  List,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { OptionalEntitySelect } from "@/components/common/optional-entity-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { Label } from "@/components/ui/label";
import { OrgExportButtons } from "@/components/organization/org-export-buttons";
import { OrgPagination } from "@/components/organization/org-pagination";
import { OrgStatusBadge } from "@/components/organization/org-status-badge";
import {
  deleteHolidayAction,
  importHolidaysAction,
  saveHolidayAction,
} from "@/lib/organization/actions";
import {
  canDeleteOrganization,
  canEditOrganization,
  canManageHolidays,
} from "@/lib/organization/constants";
import {
  FISCAL_MONTH_OPTIONS,
  HOLIDAY_TYPE_LABELS,
  holidayFormSchema,
} from "@/lib/validations/organization";
import type { LookupOption } from "@/types/employee";
import type { HolidayListItem, HolidayListResult } from "@/types/organization";
import type { RecordStatus } from "@/types/auth";
import { cn } from "@/lib/utils";

type HolidayFormInput = z.input<typeof holidayFormSchema>;

type Props = {
  result: HolidayListResult;
  branches: LookupOption[];
  departments: LookupOption[];
  permissionCodes: string[];
  viewMode: "list" | "calendar";
  search: string;
  month?: number;
};

const emptyForm: HolidayFormInput = {
  name: "",
  holidayDate: "",
  holidayType: "company",
  branchId: null,
  isOptional: false,
  isRecurring: false,
  recurringMonth: null,
  recurringDay: null,
  applicableDepartmentIds: [],
  description: "",
  status: "active",
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type DayCell = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

function buildCalendarDays(month: number, year: number): DayCell[] {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const gridStart = addDays(monthStart, -getDay(monthStart));
  const gridEnd = addDays(monthEnd, 6 - getDay(monthEnd));

  const days: DayCell[] = [];
  let current = gridStart;

  while (current <= gridEnd) {
    days.push({
      date: format(current, "yyyy-MM-dd"),
      dayNumber: current.getDate(),
      isCurrentMonth: current.getMonth() === month - 1,
    });
    current = addDays(current, 1);
  }

  return days;
}

export function HolidaysManagement({
  result,
  branches,
  departments,
  permissionCodes,
  viewMode,
  search,
  month: monthProp,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HolidayListItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canCreate = canManageHolidays(permissionCodes);
  const canEdit = canEditOrganization(permissionCodes) || canManageHolidays(permissionCodes);
  const canDelete = canDeleteOrganization(permissionCodes) || canManageHolidays(permissionCodes);

  const calendarMonth = monthProp ?? new Date().getMonth() + 1;
  const calendarYear = result.year;

  const form = useForm<HolidayFormInput>({
    resolver: zodResolver(holidayFormSchema) as never,
    defaultValues: emptyForm,
  });

  const selectedDepartments = form.watch("applicableDepartmentIds") ?? [];

  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    if (!patch.page) params.delete("page");
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  const holidayMap = useMemo(() => {
    const map = new Map<string, HolidayListItem[]>();
    result.data.forEach((holiday) => {
      const existing = map.get(holiday.holidayDate) ?? [];
      existing.push(holiday);
      map.set(holiday.holidayDate, existing);
    });
    return map;
  }, [result.data]);

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth, calendarYear),
    [calendarMonth, calendarYear],
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    form.reset(emptyForm);
    setOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (item: HolidayListItem) => {
      setEditing(item);
      form.reset({
        name: item.name,
        holidayDate: item.holidayDate,
        holidayType: item.holidayType,
        branchId: item.branchId,
        isOptional: item.isOptional,
        isRecurring: item.isRecurring,
        recurringMonth: item.recurringMonth,
        recurringDay: item.recurringDay,
        applicableDepartmentIds: item.applicableDepartmentIds,
        description: item.description ?? "",
        status: item.status,
      });
      setOpen(true);
    },
    [form],
  );

  function toggleDepartment(deptId: string) {
    const current = form.getValues("applicableDepartmentIds") ?? [];
    if (current.includes(deptId)) {
      form.setValue(
        "applicableDepartmentIds",
        current.filter((id) => id !== deptId),
      );
    } else {
      form.setValue("applicableDepartmentIds", [...current, deptId]);
    }
  }

  function onSave(values: HolidayFormInput) {
    startTransition(async () => {
      const res = await saveHolidayAction(
        {
          ...values,
          branchId: values.branchId || null,
          description: values.description || null,
          recurringMonth: values.isRecurring ? values.recurringMonth : null,
          recurringDay: values.isRecurring ? values.recurringDay : null,
        },
        editing?.id,
      );
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? "Holiday updated" : "Holiday created");
      setOpen(false);
      router.refresh();
    });
  }

  const onDelete = useCallback(
    (item: HolidayListItem) => {
      if (!window.confirm(`Delete holiday "${item.name}"?`)) return;
      startTransition(async () => {
        const res = await deleteHolidayAction(item.id);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Holiday deleted");
        router.refresh();
      });
    },
    [router],
  );

  function handleImport(file: File) {
    startTransition(async () => {
      const csvContent = await file.text();
      const res = await importHolidaysAction(csvContent);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(`Imported ${res.data.imported} holiday(s)`);
      router.refresh();
    });
  }

  const columns = useMemo<DataTableColumn<HolidayListItem & Record<string, unknown>>[]>(
    () => [
      {
        key: "name",
        header: "Holiday",
        render: (row) => (
          <div>
            <p className="font-medium">{row.name}</p>
            {row.isOptional ? (
              <p className="text-xs text-muted-foreground">Optional</p>
            ) : null}
          </div>
        ),
      },
      {
        key: "holidayDate",
        header: "Date",
        render: (row) => format(parseISO(row.holidayDate), "dd MMM yyyy"),
      },
      {
        key: "holidayType",
        header: "Type",
        render: (row) => HOLIDAY_TYPE_LABELS[row.holidayType],
      },
      {
        key: "branchName",
        header: "Branch",
        render: (row) => row.branchName ?? "All",
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <OrgStatusBadge status={row.status} />,
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

  function goToPreviousMonth() {
    if (calendarMonth === 1) {
      updateParams({ month: "12", year: String(calendarYear - 1) });
      return;
    }
    updateParams({ month: String(calendarMonth - 1) });
  }

  function goToNextMonth() {
    if (calendarMonth === 12) {
      updateParams({ month: "1", year: String(calendarYear + 1) });
      return;
    }
    updateParams({ month: String(calendarMonth + 1) });
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Holidays</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage company holidays for {result.year}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrgExportButtons entity="holidays" year={result.year} />
          {canCreate ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={isPending}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Holiday
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search holidays…"
            className="pl-9"
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({ search: (e.target as HTMLInputElement).value || undefined });
              }
            }}
          />
        </div>
        <div className="flex gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => updateParams({ view: "list" })}
          >
            <List className="mr-1.5 h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewMode === "calendar" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => updateParams({ view: "calendar" })}
          >
            <Calendar className="mr-1.5 h-4 w-4" />
            Calendar
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      ) : null}

      {viewMode === "list" ? (
        <>
          {result.data.length === 0 ? (
            <EmptyState
              title="No holidays found"
              description="Add holidays or import from CSV."
            />
          ) : (
            <DataTable columns={columns} data={result.data} />
          )}
          <OrgPagination page={result.page ?? 1} pageSize={20} total={result.total} />
        </>
      ) : (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {format(new Date(calendarYear, calendarMonth - 1, 1), "MMMM yyyy")}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon-sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
            {calendarDays.map((day) => {
              const holidays = holidayMap.get(day.date) ?? [];
              return (
                <div
                  key={day.date}
                  className={cn(
                    "min-h-20 rounded-md border p-1.5 text-sm",
                    day.isCurrentMonth ? "bg-background" : "bg-muted/30 text-muted-foreground",
                  )}
                >
                  <span className="text-xs font-medium">{day.dayNumber}</span>
                  <div className="mt-1 space-y-0.5">
                    {holidays.map((holiday) => (
                      <button
                        key={holiday.id}
                        type="button"
                        className="block w-full truncate rounded bg-primary/10 px-1 py-0.5 text-left text-xs text-primary hover:bg-primary/20"
                        onClick={() => canEdit && openEdit(holiday)}
                        title={holiday.name}
                      >
                        {holiday.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Holiday" : "Add Holiday"}
        contentClassName="sm:max-w-2xl"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Holiday
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
              <Label>Date</Label>
              <Input type="date" {...form.register("holidayDate")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Holiday Type</Label>
              <Select
                value={form.watch("holidayType")}
                onValueChange={(v) =>
                  v && form.setValue("holidayType", v as HolidayFormInput["holidayType"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(HOLIDAY_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch (optional)</Label>
              <OptionalEntitySelect
                options={branches}
                value={form.watch("branchId")}
                onValueChange={(v) => form.setValue("branchId", v)}
                placeholder="All branches"
                noneLabel="All branches"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded border"
                checked={form.watch("isOptional")}
                onChange={(e) => form.setValue("isOptional", e.target.checked)}
              />
              Optional holiday
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded border"
                checked={form.watch("isRecurring")}
                onChange={(e) => form.setValue("isRecurring", e.target.checked)}
              />
              Recurring annually
            </label>
          </div>
          {form.watch("isRecurring") ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Recurring Month</Label>
                <Select
                  value={String(form.watch("recurringMonth") ?? "")}
                  onValueChange={(v) => v && form.setValue("recurringMonth", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {FISCAL_MONTH_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recurring Day</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  {...form.register("recurringDay")}
                />
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Applicable Departments</Label>
            <div className="max-h-40 overflow-y-auto rounded-md border p-3">
              {departments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No departments available.</p>
              ) : (
                <div className="space-y-2">
                  {departments.map((dept) => (
                    <label key={dept.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded border"
                        checked={selectedDepartments.includes(dept.id)}
                        onChange={() => toggleDepartment(dept.id)}
                      />
                      {dept.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...form.register("description")}
            />
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
