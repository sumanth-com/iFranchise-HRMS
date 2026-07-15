"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { generateCeoReportAction } from "@/lib/ceo/actions/ceo-reports-actions";
import {
  FILTER_ANY_VALUE,
  filterSelectLabel,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import type {
  CeoReportCatalogItem,
  CeoReportFormat,
  CeoReportsFilterLookups,
} from "@/types/ceo-reports";

type CeoReportsBuilderProps = {
  catalog: CeoReportCatalogItem[];
  lookups: CeoReportsFilterLookups;
  disabled?: boolean;
  onGenerated: (payload: {
    runId?: string;
    filename?: string;
    mimeType?: string;
    contentBase64?: string;
    message: string;
  }) => void;
  initialReportKey?: string;
};

const FORMAT_OPTIONS: { value: CeoReportFormat; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
  { value: "csv", label: "CSV" },
  { value: "summary_pdf", label: "Executive Summary PDF" },
  { value: "board_summary", label: "Board Presentation Summary" },
];

function downloadBase64(filename: string, mimeType: string, contentBase64: string) {
  const binary = atob(contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CeoReportsBuilder({
  catalog,
  lookups,
  disabled,
  onGenerated,
  initialReportKey,
}: CeoReportsBuilderProps) {
  const [reportKey, setReportKey] = useState(
    initialReportKey ?? catalog[0]?.key ?? "",
  );
  const [departmentId, setDepartmentId] = useState<string>(FILTER_ANY_VALUE);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [format, setFormat] = useState<CeoReportFormat>("pdf");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = useMemo(
    () => catalog.find((item) => item.key === reportKey) ?? null,
    [catalog, reportKey],
  );

  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  function toggleColumn(column: string) {
    setSelectedColumns((current) =>
      current.includes(column)
        ? current.filter((item) => item !== column)
        : [...current, column],
    );
  }

  function generate(previewOnly = false) {
    if (!reportKey) return;
    startTransition(async () => {
      const result = await generateCeoReportAction({
        reportKey,
        format,
        departmentId:
          departmentId === FILTER_ANY_VALUE ? undefined : departmentId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        columns: selectedColumns.length > 0 ? selectedColumns : undefined,
        source: "builder",
      });
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      setMessage(result.message);
      if (
        !previewOnly &&
        result.filename &&
        result.mimeType &&
        result.contentBase64
      ) {
        downloadBase64(result.filename, result.mimeType, result.contentBase64);
      }
      onGenerated({
        runId: result.runId,
        filename: result.filename,
        mimeType: result.mimeType,
        contentBase64: result.contentBase64,
        message: result.message,
      });
    });
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold">Report Builder</h2>
        <p className="text-xs text-muted-foreground">
          Select type, filters, columns, then preview or generate a downloadable report.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Select
          value={reportKey}
          onValueChange={(value) => {
            setReportKey(value ?? "");
            setSelectedColumns([]);
          }}
          disabled={disabled || isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select report type" />
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
          value={departmentId}
          onValueChange={(value) => setDepartmentId(value ?? FILTER_ANY_VALUE)}
          disabled={disabled || isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every department">
              {filterSelectLabel(departmentId, "Every department", departmentOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every department</SelectItem>
            {departmentOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={format}
          onValueChange={(value) => setFormat((value as CeoReportFormat) ?? "pdf")}
          disabled={disabled || isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          disabled={disabled || isPending}
          aria-label="Builder date from"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          disabled={disabled || isPending}
          aria-label="Builder date to"
        />
      </div>

      {selected ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{selected.description}</p>
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Choose Columns
            </p>
            <div className="flex flex-wrap gap-2">
              {selected.defaultColumns.map((column) => {
                const active = selectedColumns.includes(column);
                return (
                  <button
                    key={column}
                    type="button"
                    onClick={() => toggleColumn(column)}
                    className={`rounded-md border px-2.5 py-1 text-xs ${
                      active ? "border-primary bg-primary/5 text-primary" : "bg-background"
                    }`}
                  >
                    {column}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || isPending || !reportKey}
          onClick={() => generate(true)}
        >
          Preview
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={disabled || isPending || !reportKey}
          onClick={() => generate(false)}
        >
          Generate
        </Button>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}
