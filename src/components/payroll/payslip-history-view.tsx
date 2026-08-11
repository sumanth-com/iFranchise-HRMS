"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import {
  ChevronRight,
  Download,
  Eye,
  FileText,
  History,
  Loader2,
  Mail,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { EmployeePayslipDrawer } from "@/components/employee/payroll/employee-payslip-drawer";
import { EmployeeDetailPayslipDrawer } from "@/components/employees/employee-detail-payslip-drawer";
import { Button, buttonVariants } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { PayslipHistorySummaryCards } from "@/components/payroll/payslip-history-summary-cards";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { emailMyPayslipAction } from "@/lib/employee/actions/employee-payroll-actions";
import { emailPayslipAction } from "@/lib/payroll/actions";
import { formatReviewBannerMessage } from "@/lib/payroll/services/payslip-publication";
import {
  formatCurrency,
  formatPayrollMonthLabel,
} from "@/lib/payroll/services/payroll-utils";
import type { PayslipHistoryResult, PayslipListItem } from "@/types/payroll";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type Props = {
  history: PayslipHistoryResult;
  mode: "employee" | "hr";
  basePath: string;
  currencyCode?: string;
  /** When true, omits standalone page header (e.g. inside Team Payroll hub). */
  embedded?: boolean;
};

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value.length === 10 ? value : value.slice(0, 10)), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

function getYearFilterLabel(value: string): string {
  if (value === "all") return "Year";
  if (value === "current") return "Current year";
  if (value === "last") return "Last year";
  return value;
}

function getMonthFilterLabel(value: string): string {
  if (value === "all") return "Month";
  const index = Number(value) - 1;
  return MONTHS[index] ?? "Month";
}

function PayslipRowActions({
  row,
  mode,
  onPreview,
}: {
  row: PayslipListItem;
  mode: "employee" | "hr";
  onPreview: (id: string) => void;
}) {
  const [emailPending, startEmail] = useTransition();
  const disabled = !row.canEmployeeAccess && mode === "employee";

  async function downloadPdf() {
    if (disabled) return;
    try {
      const response = await fetch(`/api/payslips/${row.id}/pdf`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Download failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Payslip-${row.payslipNumber}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to download payslip PDF");
    }
  }

  function emailCopy() {
    if (disabled) return;
    startEmail(async () => {
      const result =
        mode === "employee"
          ? await emailMyPayslipAction(row.id)
          : await emailPayslipAction(row.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(
        mode === "employee"
          ? "Payslip sent to your registered email"
          : "Payslip sent to employee's registered email",
      );
    });
  }

  return (
    <div className="flex justify-end gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1 px-2.5"
        disabled={disabled}
        onClick={() => onPreview(row.id)}
      >
        <Eye className="size-3.5" />
        Preview
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1 px-2.5"
        disabled={disabled}
        onClick={() => void downloadPdf()}
      >
        <Download className="size-3.5" />
        PDF
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1 px-2.5"
        disabled={disabled || emailPending}
        onClick={emailCopy}
      >
        {emailPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Mail className="size-3.5" />
        )}
        Email
      </Button>
    </div>
  );
}

function PayslipTable({
  rows,
  mode,
  showEmployee,
  onPreview,
}: {
  rows: PayslipListItem[];
  mode: "employee" | "hr";
  showEmployee?: boolean;
  onPreview: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] text-sm">
        <thead>
          <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="pb-2.5 pr-3 font-medium">Payroll Month</th>
            {showEmployee ? <th className="pb-2.5 pr-3 font-medium">Employee</th> : null}
            <th className="pb-2.5 pr-3 font-medium">Credit Date</th>
            <th className="pb-2.5 pr-3 font-medium">Published</th>
            <th className="pb-2.5 pr-3 font-medium">Gross</th>
            <th className="pb-2.5 pr-3 font-medium">Net</th>
            <th className="pb-2.5 pr-3 font-medium">Payment</th>
            <th className="pb-2.5 pr-3 font-medium">Version</th>
            <th className="pb-2.5 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn("border-b last:border-0", row.isArchived && "opacity-60")}
            >
              <td className="py-3 pr-3">
                <div className="font-medium">{formatPayrollMonthLabel(row.payrollMonth)}</div>
                <div className="text-xs text-muted-foreground">{row.payslipNumber}</div>
              </td>
              {showEmployee ? (
                <td className="py-3 pr-3">
                  <div>{row.employeeName}</div>
                  <div className="text-xs text-muted-foreground">{row.employeeCode}</div>
                </td>
              ) : null}
              <td className="py-3 pr-3 text-muted-foreground">
                {fmtDate(row.salaryCreditDate)}
              </td>
              <td className="py-3 pr-3 text-muted-foreground">{fmtDate(row.publishedAt)}</td>
              <td className="py-3 pr-3 tabular-nums">{formatCurrency(row.grossSalary)}</td>
              <td className="py-3 pr-3 tabular-nums font-medium">
                {formatCurrency(row.netSalary)}
              </td>
              <td className="py-3 pr-3">
                {row.availability === "under_review" ? (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-800">
                    HR Review
                  </span>
                ) : row.isArchived ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Archived
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    {row.paymentStatus}
                  </span>
                )}
              </td>
              <td className="py-3 pr-3 text-muted-foreground">
                v{row.payslipVersion}
                {row.versionCount > 1 ? (
                  <span className="ml-1 text-[10px]">({row.versionCount})</span>
                ) : null}
              </td>
              <td className="py-3">
                <PayslipRowActions row={row} mode={mode} onPreview={onPreview} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PayslipHistoryView({
  history,
  mode,
  basePath,
  embedded = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [activePayslipId, setActivePayslipId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years =
      history.stats.yearsAvailable.length > 0
        ? history.stats.yearsAvailable
        : [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
    return years;
  }, [history.stats.yearsAvailable, currentYear]);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === "all") params.delete(key);
        else params.set(key, value);
      });
      params.delete("page");
      startTransition(() => router.push(`${basePath}?${params.toString()}`));
    },
    [basePath, router, searchParams, startTransition],
  );

  const yearDefault =
    searchParams.get("yearFilter") ?? searchParams.get("year") ?? "all";
  const monthDefault = searchParams.get("month") || "all";
  const hasActiveFilters =
    Boolean(searchParams.get("search")) ||
    yearDefault !== "all" ||
    monthDefault !== "all";

  const underReview = history.data.find((row) => row.availability === "under_review");

  function openPreview(id: string) {
    setActivePayslipId(id);
    setPreviewOpen(true);
  }

  return (
    <div className="space-y-4">
      {!embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <History className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Payroll Archive</span>
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Payslip History</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Secure access to all salary statements issued during employment. Records are
              permanently retained and never deleted.
            </p>
          </div>
          {mode === "employee" ? (
            <Link
              href="/employee/payroll"
              className={buttonVariants({ variant: "outline" })}
            >
              <ChevronRight className="mr-1 size-4 rotate-180" />
              Back to Payroll
            </Link>
          ) : null}
        </div>
      ) : null}

      <PayslipHistorySummaryCards stats={history.stats} mode={mode} />

      <div
        className={cn(
          "sticky z-10 -mx-1 px-1",
          embedded ? "top-0" : "top-0",
        )}
      >
        <div
          className="rounded-xl border bg-card/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search month, payslip number, year…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    updateParams({ search: searchInput.trim() || undefined });
                  }
                }}
              />
            </div>
            <Select
              value={yearDefault}
              onValueChange={(value) => {
                if (!value || value === "all" || value === "current" || value === "last") {
                  updateParams({
                    yearFilter: value === "current" || value === "last" ? value : undefined,
                    year: undefined,
                  });
                } else {
                  updateParams({ year: value, yearFilter: undefined });
                }
              }}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="Year">
                  {(value) => {
                    const label = getYearFilterLabel(String(value ?? "all"));
                    const isDefault = !value || value === "all";
                    return (
                      <span className={isDefault ? "text-muted-foreground" : undefined}>
                        {label}
                      </span>
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                <SelectItem value="current">Current year</SelectItem>
                <SelectItem value="last">Last year</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={monthDefault}
              onValueChange={(value) => {
                const month = value && value !== "all" ? value : undefined;
                updateParams({ month });
              }}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="Month">
                  {(value) => {
                    const label = getMonthFilterLabel(String(value ?? "all"));
                    const isDefault = !value || value === "all";
                    return (
                      <span className={isDefault ? "text-muted-foreground" : undefined}>
                        {label}
                      </span>
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {MONTHS.map((label, index) => (
                  <SelectItem key={label} value={String(index + 1)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  setSearchInput("");
                  updateParams({
                    search: undefined,
                    year: undefined,
                    yearFilter: undefined,
                    month: undefined,
                  });
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {underReview ? (
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          {formatReviewBannerMessage(underReview.publishedAt)}
        </div>
      ) : null}

      <div className="rounded-xl border bg-card shadow-sm">
        {history.data.length > 0 ? (
          history.groups.length > 0 ? (
            <div className="divide-y">
              {history.groups.map((group) => (
                <section key={group.year} className="p-4 md:p-5">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileText className="size-4 text-muted-foreground" />
                    {group.year}
                  </h2>
                  <PayslipTable
                    rows={group.payslips}
                    mode={mode}
                    showEmployee={mode === "hr"}
                    onPreview={openPreview}
                  />
                </section>
              ))}
            </div>
          ) : (
            <div className="p-4 md:p-5">
              <PayslipTable
                rows={history.data}
                mode={mode}
                showEmployee={mode === "hr"}
                onPreview={openPreview}
              />
            </div>
          )
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No payslips match your filters.
          </p>
        )}
      </div>

      {history.total > history.pageSize ? (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={history.page <= 1}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(history.page - 1));
              router.push(`${basePath}?${params.toString()}`);
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={history.page * history.pageSize >= history.total}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(history.page + 1));
              router.push(`${basePath}?${params.toString()}`);
            }}
          >
            Next
          </Button>
        </div>
      ) : null}

      {mode === "hr" ? (
        <EmployeeDetailPayslipDrawer
          payslipId={activePayslipId}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          canEmail
        />
      ) : (
        <EmployeePayslipDrawer
          payslipId={activePayslipId}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </div>
  );
}
