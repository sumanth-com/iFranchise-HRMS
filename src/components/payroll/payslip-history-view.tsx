"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import {
  ChevronRight,
  Download,
  Eye,
  History,
  Loader2,
  Mail,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { EmployeePayslipDrawer } from "@/components/employee/payroll/employee-payslip-drawer";
import { EmployeeDetailPayslipDrawer } from "@/components/employees/employee-detail-payslip-drawer";
import { Button, buttonVariants } from "@/components/common/button";
import {
  TABLE_HEADER_CELL_CLASS,
  TABLE_HEADER_STICKY_CLASS,
} from "@/components/common/table-header-classes";
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
  month: number;
  year: number;
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

function getMonthFilterLabel(value: string): string {
  const index = Number(value) - 1;
  return MONTHS[index] ?? "this month";
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
    <table className="w-full min-w-[56rem] text-sm">
      <thead className={TABLE_HEADER_STICKY_CLASS}>
        <tr className="border-white/10 bg-black hover:bg-black">
          <th className={TABLE_HEADER_CELL_CLASS}>Payroll Month</th>
          {showEmployee ? <th className={TABLE_HEADER_CELL_CLASS}>Employee</th> : null}
          <th className={TABLE_HEADER_CELL_CLASS}>Credit Date</th>
          <th className={TABLE_HEADER_CELL_CLASS}>Published</th>
          <th className={TABLE_HEADER_CELL_CLASS}>Gross</th>
          <th className={TABLE_HEADER_CELL_CLASS}>Net</th>
          <th className={TABLE_HEADER_CELL_CLASS}>Payment</th>
          <th className={TABLE_HEADER_CELL_CLASS}>Version</th>
          <th className={cn(TABLE_HEADER_CELL_CLASS, "text-right")}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            className={cn("border-b last:border-0", row.isArchived && "opacity-60")}
          >
            <td className="px-4 py-3">
              <div className="font-medium">{formatPayrollMonthLabel(row.payrollMonth)}</div>
              <div className="text-xs text-muted-foreground">{row.payslipNumber}</div>
            </td>
            {showEmployee ? (
              <td className="px-4 py-3">
                <div>{row.employeeName}</div>
                <div className="text-xs text-muted-foreground">{row.employeeCode}</div>
              </td>
            ) : null}
            <td className="px-4 py-3 text-muted-foreground">
              {fmtDate(row.salaryCreditDate)}
            </td>
            <td className="px-4 py-3 text-muted-foreground">{fmtDate(row.publishedAt)}</td>
            <td className="px-4 py-3 tabular-nums">{formatCurrency(row.grossSalary)}</td>
            <td className="px-4 py-3 tabular-nums font-medium">
              {formatCurrency(row.netSalary)}
            </td>
            <td className="px-4 py-3">
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
            <td className="px-4 py-3 text-muted-foreground">
              v{row.payslipVersion}
              {row.versionCount > 1 ? (
                <span className="ml-1 text-[10px]">({row.versionCount})</span>
              ) : null}
            </td>
            <td className="px-4 py-3">
              <PayslipRowActions row={row} mode={mode} onPreview={onPreview} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PayslipHistoryView({
  history,
  mode,
  basePath,
  month,
  year,
  embedded = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [activePayslipId, setActivePayslipId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [monthValue, setMonthValue] = useState(String(month));
  const [yearValue, setYearValue] = useState(String(year));

  useEffect(() => {
    setMonthValue(String(month));
    setYearValue(String(year));
  }, [month, year]);

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years = new Set([
      currentYear,
      currentYear - 1,
      currentYear - 2,
      currentYear - 3,
      year,
      ...history.stats.yearsAvailable,
    ]);
    return Array.from(years).sort((a, b) => b - a);
  }, [history.stats.yearsAvailable, currentYear, year]);

  const updateParams = useCallback(
    (nextMonth: string, nextYear: string, extra?: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", nextMonth);
      params.set("year", nextYear);
      params.delete("yearFilter");
      params.delete("page");
      if (extra) {
        Object.entries(extra).forEach(([key, value]) => {
          if (!value) params.delete(key);
          else params.set(key, value);
        });
      }
      startTransition(() => router.push(`${basePath}?${params.toString()}`));
    },
    [basePath, router, searchParams, startTransition],
  );

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
                    updateParams(monthValue, yearValue, {
                      search: searchInput.trim() || undefined,
                    });
                  }
                }}
              />
            </div>
            <Select
              value={yearValue}
              onValueChange={(value) => {
                if (!value) return;
                setYearValue(value);
                updateParams(monthValue, value);
              }}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue>{yearValue}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((optionYear) => (
                  <SelectItem key={optionYear} value={String(optionYear)}>
                    {optionYear}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={monthValue}
              onValueChange={(value) => {
                if (!value) return;
                setMonthValue(value);
                updateParams(value, yearValue);
              }}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue>{getMonthFilterLabel(monthValue)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((label, index) => (
                  <SelectItem key={label} value={String(index + 1)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {underReview ? (
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          {formatReviewBannerMessage(underReview.publishedAt)}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="max-h-[calc(100vh-22rem)] overflow-auto">
          {isPending ? (
            <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading payslips...
            </div>
          ) : history.data.length > 0 ? (
            <PayslipTable
              rows={history.data}
              mode={mode}
              showEmployee={mode === "hr"}
              onPreview={openPreview}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No payslips found for {getMonthFilterLabel(monthValue)} {yearValue}.
            </p>
          )}
        </div>
      </div>

      {history.total > history.pageSize ? (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={history.page <= 1}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("month", monthValue);
              params.set("year", yearValue);
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
              params.set("month", monthValue);
              params.set("year", yearValue);
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
