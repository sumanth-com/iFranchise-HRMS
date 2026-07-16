"use client";

import { format } from "date-fns";
import { CalendarClock, Mail, Pause, Play, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  deleteCeoReportScheduleAction,
  saveCeoReportScheduleAction,
  toggleCeoReportScheduleAction,
} from "@/lib/ceo/actions/ceo-reports-actions";
import { MANAGER_FILTER_SELECT_CONTENT_CLASS } from "@/lib/manager/filter-select";
import type { CeoReportCatalogItem, CeoReportScheduleRow } from "@/types/ceo-reports";
import type { ReportScheduleFrequency } from "@/types/reports";
import { cn } from "@/lib/utils";

type CeoReportsSchedulesProps = {
  schedules: CeoReportScheduleRow[];
  catalog: CeoReportCatalogItem[];
  initialReportKey?: string;
  onChanged: () => void;
};

const FREQUENCIES: { value: ReportScheduleFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const FREQUENCY_HINT: Record<ReportScheduleFrequency, string> = {
  daily: "Delivers every weekday morning",
  weekly: "Delivers every Monday",
  monthly: "Delivers on the 1st of each month",
  quarterly: "Delivers at the start of each quarter",
  yearly: "Delivers once a year in January",
};

export function CeoReportsSchedules({
  schedules,
  catalog,
  initialReportKey,
  onChanged,
}: CeoReportsSchedulesProps) {
  const [name, setName] = useState("");
  const [reportKey, setReportKey] = useState(
    initialReportKey ?? catalog[0]?.key ?? "",
  );
  const [frequency, setFrequency] = useState<ReportScheduleFrequency>("monthly");
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">("pdf");
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialReportKey) setReportKey(initialReportKey);
  }, [initialReportKey]);

  const selectedReport = catalog.find((item) => item.key === reportKey);

  function createSchedule() {
    const emails = recipients
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    startTransition(async () => {
      const result = await saveCeoReportScheduleAction({
        name:
          name ||
          `${selectedReport?.title ?? "Report"} · ${frequency}`,
        reportKey,
        frequency,
        exportFormat,
        recipients: emails,
        isEnabled: true,
      });
      setMessage(result.message);
      if (result.success) {
        setName("");
        setRecipients("");
        onChanged();
      }
    });
  }

  return (
    <section className="w-full space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Scheduled Delivery</h2>
        <p className="text-xs text-muted-foreground">
          Auto-send board and executive packs to leadership on a set cadence
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-start gap-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <CalendarClock className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">New recurring delivery</p>
            <p className="text-xs text-muted-foreground">
              {FREQUENCY_HINT[frequency]}
              {selectedReport ? ` · ${selectedReport.title}` : ""}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name (e.g. Monthly board pack)"
            disabled={isPending}
            className="h-10 min-w-[12rem] lg:min-w-0 lg:flex-[1.2]"
            aria-label="Schedule name"
          />
          <Select
            value={reportKey}
            onValueChange={(value) => setReportKey(value ?? "")}
            disabled={isPending}
          >
            <SelectTrigger className="h-10 min-w-[11rem] lg:min-w-0 lg:flex-1">
              <SelectValue placeholder="Report type" />
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
            >
              {catalog.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={frequency}
            onValueChange={(value) =>
              setFrequency((value as ReportScheduleFrequency) ?? "monthly")
            }
            disabled={isPending}
          >
            <SelectTrigger className="h-10 w-full min-w-[8rem] lg:w-auto lg:min-w-0 lg:flex-[0.65]">
              <SelectValue placeholder="Cadence" />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={exportFormat}
            onValueChange={(value) =>
              setExportFormat((value as "csv" | "excel" | "pdf") ?? "pdf")
            }
            disabled={isPending}
          >
            <SelectTrigger className="h-10 w-full min-w-[6.5rem] lg:w-auto lg:min-w-0 lg:flex-[0.5]">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-2 flex w-full flex-wrap items-center gap-2 lg:flex-nowrap">
          <div className="relative min-w-0 flex-1">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={recipients}
              onChange={(event) => setRecipients(event.target.value)}
              placeholder="Leadership emails (comma-separated)"
              className="h-10 pl-9"
              disabled={isPending}
              aria-label="Recipients"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-10 shrink-0 px-4"
            disabled={isPending || !reportKey}
            onClick={createSchedule}
          >
            Schedule delivery
          </Button>
        </div>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      {schedules.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/60 px-4 py-8 text-center shadow-sm">
          <p className="text-sm font-medium">No recurring deliveries yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Schedule a report above so leadership receives packs automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_7rem_5.5rem_7.5rem_6.5rem_auto] gap-3 border-b bg-muted/40 px-4 py-2.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase xl:grid">
            <span>Delivery</span>
            <span>Report</span>
            <span>Cadence</span>
            <span>Format</span>
            <span>Next run</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y">
            {schedules.map((item) => (
              <li
                key={item.id}
                className="grid gap-3 px-4 py-3.5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_7rem_5.5rem_7.5rem_6.5rem_auto] xl:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-tight">
                    {item.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.recipients.length > 0
                      ? `${item.recipients.length} recipient${item.recipients.length === 1 ? "" : "s"}`
                      : "No recipients set"}
                  </p>
                </div>
                <p className="truncate text-sm text-muted-foreground xl:text-foreground">
                  {item.reportTitle}
                </p>
                <p className="text-sm capitalize">{item.frequency}</p>
                <p className="text-sm uppercase tracking-wide">
                  {item.exportFormat}
                </p>
                <p className="text-sm tabular-nums">
                  {item.nextRunAt
                    ? format(new Date(item.nextRunAt), "d MMM yyyy")
                    : "—"}
                </p>
                <div>
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium",
                      item.isEnabled
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.isEnabled ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 xl:justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await toggleCeoReportScheduleAction({
                          scheduleId: item.id,
                          isEnabled: !item.isEnabled,
                        });
                        setMessage(result.message);
                        if (result.success) onChanged();
                      })
                    }
                  >
                    {item.isEnabled ? (
                      <>
                        <Pause className="size-3.5" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="size-3.5" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteCeoReportScheduleAction({
                          scheduleId: item.id,
                        });
                        setMessage(result.message);
                        if (result.success) onChanged();
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
