"use client";

import { format } from "date-fns";
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

  function createSchedule() {
    const emails = recipients
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    startTransition(async () => {
      const result = await saveCeoReportScheduleAction({
        name: name || `${catalog.find((item) => item.key === reportKey)?.title ?? "Report"} schedule`,
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
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Scheduled Reports</h2>
        <p className="text-xs text-muted-foreground">
          Create recurring executive reports with recipients and formats.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-3">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Schedule name"
          disabled={isPending}
        />
        <Select
          value={reportKey}
          onValueChange={(value) => setReportKey(value ?? "")}
          disabled={isPending}
        >
          <SelectTrigger>
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
          <SelectTrigger>
            <SelectValue placeholder="Frequency" />
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
          <SelectTrigger>
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="excel">Excel</SelectItem>
            <SelectItem value="csv">CSV</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={recipients}
          onChange={(event) => setRecipients(event.target.value)}
          placeholder="Recipients (comma-separated emails)"
          className="md:col-span-2"
          disabled={isPending}
        />
        <div className="flex items-end">
          <Button type="button" size="sm" disabled={isPending} onClick={createSchedule}>
            Create Schedule
          </Button>
        </div>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Report</th>
              <th className="px-4 py-2.5 font-medium">Frequency</th>
              <th className="px-4 py-2.5 font-medium">Next Run</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No scheduled reports yet.
                </td>
              </tr>
            ) : (
              schedules.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-2.5">{item.name}</td>
                  <td className="px-4 py-2.5">{item.reportTitle}</td>
                  <td className="px-4 py-2.5 capitalize">{item.frequency}</td>
                  <td className="px-4 py-2.5">
                    {item.nextRunAt
                      ? format(new Date(item.nextRunAt), "dd MMM yyyy")
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {item.isEnabled ? "Enabled" : "Disabled"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
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
                        {item.isEnabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
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
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
