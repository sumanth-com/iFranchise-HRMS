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
import { cn } from "@/lib/utils";

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
  { value: "summary_pdf", label: "Exec Summary" },
  { value: "board_summary", label: "Board Pack" },
];

const QUICK_KEYS = [
  "ceo_executive_summary",
  "ceo_board_report",
  "ceo_compliance_report",
  "ceo_organization_report",
  "ceo_headcount_report",
];

function cleanTitle(title: string) {
  return title.replace(/^CEO\s+/i, "");
}

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

function sortCatalog(catalog: CeoReportCatalogItem[]) {
  const priority = new Map(QUICK_KEYS.map((key, index) => [key, index]));
  return [...catalog].sort((a, b) => {
    const aRank = priority.get(a.key) ?? 100;
    const bRank = priority.get(b.key) ?? 100;
    if (aRank !== bRank) return aRank - bRank;
    return a.title.localeCompare(b.title);
  });
}

export function CeoReportsBuilder({
  catalog,
  lookups,
  disabled,
  onGenerated,
  initialReportKey,
}: CeoReportsBuilderProps) {
  const sortedCatalog = useMemo(() => sortCatalog(catalog), [catalog]);
  const [reportKey, setReportKey] = useState(
    initialReportKey ?? sortedCatalog[0]?.key ?? "",
  );
  const [departmentId, setDepartmentId] = useState<string>(FILTER_ANY_VALUE);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [format, setFormat] = useState<CeoReportFormat>("pdf");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = useMemo(
    () => sortedCatalog.find((item) => item.key === reportKey) ?? null,
    [sortedCatalog, reportKey],
  );

  const quickPicks = useMemo(
    () =>
      QUICK_KEYS.map((key) => sortedCatalog.find((item) => item.key === key)).filter(
        (item): item is CeoReportCatalogItem => Boolean(item),
      ),
    [sortedCatalog],
  );

  const moreReports = useMemo(
    () => sortedCatalog.filter((item) => !QUICK_KEYS.includes(item.key)),
    [sortedCatalog],
  );

  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));

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
    <section className="w-full space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Generate Report</h2>
        <p className="text-xs text-muted-foreground">
          Choose a pack, set scope, then preview or download
        </p>
      </div>

      {quickPicks.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {quickPicks.map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={disabled || isPending}
              onClick={() => setReportKey(item.key)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                reportKey === item.key
                  ? "border-primary bg-primary/5 text-primary"
                  : "bg-background hover:border-primary/30",
              )}
            >
              {cleanTitle(item.title)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
        {moreReports.length > 0 ? (
          <Select
            value={
              moreReports.some((item) => item.key === reportKey)
                ? reportKey
                : FILTER_ANY_VALUE
            }
            onValueChange={(value) => {
              if (value && value !== FILTER_ANY_VALUE) setReportKey(value);
            }}
            disabled={disabled || isPending}
          >
            <SelectTrigger className="h-10 w-full min-w-[11rem] lg:min-w-0 lg:flex-[1.2]">
              <SelectValue placeholder="Other reports">
                {moreReports.some((item) => item.key === reportKey) && selected
                  ? cleanTitle(selected.title)
                  : "Other reports"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
            >
              <SelectItem value={FILTER_ANY_VALUE}>Other reports</SelectItem>
              {moreReports.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {cleanTitle(item.title)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : quickPicks.length === 0 ? (
          <Select
            value={reportKey}
            onValueChange={(value) => setReportKey(value ?? "")}
            disabled={disabled || isPending}
          >
            <SelectTrigger className="h-10 w-full min-w-[11rem] lg:min-w-0 lg:flex-[1.3]">
              <SelectValue placeholder="Select report">
                {selected ? cleanTitle(selected.title) : "Select report"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
            >
              {sortedCatalog.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {cleanTitle(item.title)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Select
          value={departmentId}
          onValueChange={(value) => setDepartmentId(value ?? FILTER_ANY_VALUE)}
          disabled={disabled || isPending}
        >
          <SelectTrigger className="h-10 w-full min-w-[9rem] lg:min-w-0 lg:flex-1">
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
          <SelectTrigger className="h-10 w-full min-w-[7rem] lg:min-w-0 lg:flex-[0.65]">
            <SelectValue placeholder="Format">
              {FORMAT_OPTIONS.find((item) => item.value === format)?.label ?? "PDF"}
            </SelectValue>
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
          aria-label="From date"
          className="h-10 w-full min-w-[8.5rem] lg:min-w-0 lg:flex-[0.85]"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          disabled={disabled || isPending}
          aria-label="To date"
          className="h-10 w-full min-w-[8.5rem] lg:min-w-0 lg:flex-[0.85]"
        />

        <div className="flex w-full shrink-0 gap-2 lg:w-auto">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-10 flex-1 lg:flex-none"
            disabled={disabled || isPending || !reportKey}
            onClick={() => generate(true)}
          >
            Preview
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-10 flex-1 lg:flex-none"
            disabled={disabled || isPending || !reportKey}
            onClick={() => generate(false)}
          >
            Generate
          </Button>
        </div>
      </div>

      {selected ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {selected.description}
        </p>
      ) : null}

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}
