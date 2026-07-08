"use client";

import { format } from "date-fns";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  canExportReports,
  canScheduleReports,
  REPORT_DEFINITIONS,
  REPORT_KEY_LABELS,
} from "@/lib/reports/constants";
import {
  deleteReportScheduleAction,
  exportReportAction,
  processDueSchedulesAction,
  runScheduleNowAction,
  saveReportScheduleAction,
} from "@/lib/reports/actions";
import { reportScheduleSchema } from "@/lib/validations/reports";
import type {
  ReportExportFormat,
  ReportKey,
  ReportScheduleItem,
  ReportScheduleRunItem,
} from "@/types/reports";

type ScheduleFormInput = {
  name: string;
  reportKey: ReportKey;
  frequency: "daily" | "weekly" | "monthly";
  exportFormat: ReportExportFormat;
  recipients: string;
  isEnabled: boolean;
};

type Props = {
  schedules: ReportScheduleItem[];
  runs: ReportScheduleRunItem[];
  permissionCodes: string[];
};

function downloadBase64(filename: string, mimeType: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const emptyForm: ScheduleFormInput = {
  name: "",
  reportKey: REPORT_DEFINITIONS[0]?.key ?? "hr_employee_master",
  frequency: "weekly",
  exportFormat: "csv",
  recipients: "",
  isEnabled: true,
};

export function ExportsSchedulesManagement({
  schedules,
  runs,
  permissionCodes,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReportScheduleItem | null>(null);
  const [quickReportKey, setQuickReportKey] = useState<ReportKey>(
    REPORT_DEFINITIONS[0]?.key ?? "hr_employee_master",
  );

  const canSchedule = canScheduleReports(permissionCodes);
  const canExport = canExportReports(permissionCodes);

  const form = useForm<ScheduleFormInput>({
    defaultValues: emptyForm,
  });

  const reportItems = useMemo(
    () => REPORT_DEFINITIONS.map((d) => ({ value: d.key, label: d.title })),
    [],
  );
  const frequencyItems = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];
  const formatItems = [
    { value: "csv", label: "CSV" },
    { value: "excel", label: "Excel" },
    { value: "pdf", label: "PDF" },
  ];

  const openCreate = useCallback(() => {
    setEditing(null);
    form.reset(emptyForm);
    setOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (item: ReportScheduleItem) => {
      setEditing(item);
      form.reset({
        name: item.name,
        reportKey: item.reportKey,
        frequency: item.frequency,
        exportFormat: item.exportFormat,
        recipients: item.recipients.join(", "),
        isEnabled: item.isEnabled,
      });
      setOpen(true);
    },
    [form],
  );

  function onSave(values: ScheduleFormInput) {
    const recipients = values.recipients
      .split(/[,;\s]+/)
      .map((email) => email.trim())
      .filter(Boolean);

    const parsed = reportScheduleSchema.safeParse({
      name: values.name,
      reportKey: values.reportKey,
      frequency: values.frequency,
      exportFormat: values.exportFormat,
      recipients,
      isEnabled: values.isEnabled,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid schedule");
      return;
    }

    startTransition(async () => {
      const res = await saveReportScheduleAction(parsed.data, editing?.id);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? "Schedule updated" : "Schedule created");
      setOpen(false);
      router.refresh();
    });
  }

  const onDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this schedule?")) return;
      startTransition(async () => {
        const res = await deleteReportScheduleAction(id);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Schedule deleted");
        router.refresh();
      });
    },
    [router],
  );

  const onRunNow = useCallback(
    (id: string) => {
      startTransition(async () => {
        const res = await runScheduleNowAction(id);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success("Schedule run completed");
        router.refresh();
      });
    },
    [router],
  );

  function onProcessDue() {
    startTransition(async () => {
      const res = await processDueSchedulesAction();
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(
        `Processed ${res.data.processed} schedule${res.data.processed === 1 ? "" : "s"}`,
      );
      router.refresh();
    });
  }

  function onQuickExport(format: ReportExportFormat) {
    startTransition(async () => {
      const res = await exportReportAction(quickReportKey, {}, format);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      downloadBase64(res.filename, res.mimeType, res.contentBase64);
      toast.success(`Exported ${res.rowCount} row${res.rowCount === 1 ? "" : "s"}`);
    });
  }

  const scheduleColumns = useMemo<
    DataTableColumn<ReportScheduleItem & Record<string, unknown>>[]
  >(
    () => [
      {
        key: "name",
        header: "Schedule",
        render: (row) => (
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {REPORT_KEY_LABELS[row.reportKey] ?? row.reportKey}
            </p>
          </div>
        ),
      },
      {
        key: "frequency",
        header: "Frequency",
        render: (row) => (
          <span className="capitalize">
            {row.frequency} · {row.exportFormat.toUpperCase()}
          </span>
        ),
      },
      {
        key: "recipients",
        header: "Recipients",
        render: (row) => row.recipients.join(", ") || "—",
      },
      {
        key: "isEnabled",
        header: "Status",
        render: (row) => (row.isEnabled ? "Enabled" : "Disabled"),
      },
      {
        key: "nextRunAt",
        header: "Next run",
        render: (row) =>
          row.nextRunAt
            ? format(new Date(row.nextRunAt), "dd MMM yyyy HH:mm")
            : "—",
      },
      {
        key: "lastRunStatus",
        header: "Last run",
        render: (row) => (
          <div>
            <p className="text-sm capitalize">{row.lastRunStatus ?? "—"}</p>
            {row.lastRunAt ? (
              <p className="text-xs text-muted-foreground">
                {format(new Date(row.lastRunAt), "dd MMM yyyy HH:mm")}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) =>
          canSchedule ? (
            <div className="flex gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => onRunNow(row.id)}
                aria-label="Run now"
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => openEdit(row)}
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => onDelete(row.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : (
            "—"
          ),
      },
    ],
    [canSchedule, isPending, onDelete, onRunNow, openEdit],
  );

  const runColumns = useMemo<
    DataTableColumn<ReportScheduleRunItem & Record<string, unknown>>[]
  >(
    () => [
      {
        key: "reportKey",
        header: "Report",
        render: (row) =>
          REPORT_KEY_LABELS[row.reportKey as ReportKey] ?? row.reportKey,
      },
      {
        key: "exportFormat",
        header: "Format",
        render: (row) => row.exportFormat.toUpperCase(),
      },
      {
        key: "runStatus",
        header: "Status",
        render: (row) => <span className="capitalize">{row.runStatus}</span>,
      },
      {
        key: "rowCount",
        header: "Rows",
        render: (row) => row.rowCount,
      },
      {
        key: "message",
        header: "Message",
        render: (row) => row.message ?? "—",
      },
      {
        key: "createdAt",
        header: "Ran at",
        render: (row) => format(new Date(row.createdAt), "dd MMM yyyy HH:mm"),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exports & Schedules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule recurring report deliveries and export any report on demand.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSchedule ? (
            <>
              <Button variant="outline" disabled={isPending} onClick={onProcessDue}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Process Due
              </Button>
              <Button onClick={openCreate} disabled={isPending}>
                <Plus className="mr-2 h-4 w-4" />
                New Schedule
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {canExport ? (
        <section className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-medium">Quick export</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-2">
              <Label>Report</Label>
              <LabeledSelect
                items={reportItems}
                value={quickReportKey}
                onValueChange={(value) => setQuickReportKey(value as ReportKey)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onQuickExport("csv")}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onQuickExport("excel")}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onQuickExport("pdf")}
            >
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Schedules</h2>
        {schedules.length === 0 ? (
          <EmptyState
            title="No schedules"
            description="Create a schedule to email recurring report exports."
          />
        ) : (
          <DataTable columns={scheduleColumns} data={schedules} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent runs</h2>
        {runs.length === 0 ? (
          <EmptyState
            title="No runs yet"
            description="Schedule runs will appear here after processing."
          />
        ) : (
          <DataTable columns={runColumns} data={runs} />
        )}
      </section>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Schedule" : "New Schedule"}
        contentClassName="sm:max-w-lg"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Schedule
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register("name")} placeholder="Weekly headcount" />
          </div>
          <div className="space-y-2">
            <Label>Report</Label>
            <LabeledSelect
              items={reportItems}
              value={form.watch("reportKey")}
              onValueChange={(value) =>
                form.setValue("reportKey", value as ReportKey, { shouldDirty: true })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <LabeledSelect
                items={frequencyItems}
                value={form.watch("frequency")}
                onValueChange={(value) =>
                  form.setValue(
                    "frequency",
                    value as ScheduleFormInput["frequency"],
                    { shouldDirty: true },
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Export format</Label>
              <LabeledSelect
                items={formatItems}
                value={form.watch("exportFormat")}
                onValueChange={(value) =>
                  form.setValue("exportFormat", value as ReportExportFormat, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Recipients</Label>
            <Input
              {...form.register("recipients")}
              placeholder="hr@company.com, finance@company.com"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated email addresses.
            </p>
          </div>
          <label className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-input"
              checked={form.watch("isEnabled")}
              onChange={(e) =>
                form.setValue("isEnabled", e.target.checked, { shouldDirty: true })
              }
            />
            <span>
              <span className="font-medium">Enabled</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Disabled schedules are skipped when processing due jobs.
              </span>
            </span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
