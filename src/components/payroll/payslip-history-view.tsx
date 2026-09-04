"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import {
  Check,
  ChevronRight,
  Download,
  Eye,
  History,
  Loader2,
  Mail,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { EmployeePayslipDrawer } from "@/components/employee/payroll/employee-payslip-drawer";
import { EmployeeDetailPayslipDrawer } from "@/components/employees/employee-detail-payslip-drawer";
import { PayrollSendPayslipDialog } from "@/components/payroll/payroll-run-item-dialogs";
import { Button, buttonVariants } from "@/components/common/button";
import {
  TABLE_HEADER_CELL_CLASS,
  TABLE_HEADER_ROW_CLASS,
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
import { emailPayslipAction, ensurePayrollItemPayslipAction } from "@/lib/payroll/actions";
import { formatReviewBannerMessage } from "@/lib/payroll/services/payslip-publication";
import {
  formatCurrency,
  formatPayrollMonthLabel,
  mapPayrollDisplayAmounts,
} from "@/lib/payroll/services/payroll-utils";
import { getHrmsYears } from "@/lib/date/hrms-year";
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
  onSend,
  viewingId,
}: {
  row: PayslipListItem;
  mode: "employee" | "hr";
  onPreview: (row: PayslipListItem) => void;
  onSend?: (row: PayslipListItem) => void;
  viewingId?: string | null;
}) {
  const [emailPending, startEmail] = useTransition();
  const disabled = !row.canEmployeeAccess && mode === "employee";

  async function downloadPdf() {
    if (disabled || !row.hasPayslip) return;
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

  if (mode === "hr") {
    return (
      <div className="flex justify-end gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2.5"
          title="View"
          disabled={Boolean(viewingId)}
          onClick={() => onPreview(row)}
        >
          {viewingId === row.payrollItemId ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Eye className="size-3.5" />
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2.5"
          title="Send Payslip"
          disabled={!row.payrollItemId || row.payslipSent}
          onClick={() => onSend?.(row)}
        >
          <Send className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1 px-2.5"
        disabled={disabled}
        onClick={() => onPreview(row)}
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

function payslipAmounts(row: PayslipListItem) {
  return mapPayrollDisplayAmounts({
    basicSalary: row.basicSalary ?? 0,
    grossSalary: row.grossSalary,
    netSalary: row.netSalary,
    totalDeductions: row.totalDeductions ?? 0,
    totalAllowances: row.totalAllowances ?? 0,
    breakdown: row.breakdown,
  });
}

function PayslipStatusIndicator({ row }: { row: PayslipListItem }) {
  if (row.payslipSent) {
    return (
      <span
        className="inline-flex size-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        title="Sent"
        aria-label="Sent"
      >
        <Check className="size-4 stroke-[2.5]" aria-hidden />
      </span>
    );
  }

  const readyToSend = row.paymentStatus === "Ready to Send" || row.hasPayslip;
  if (readyToSend) {
    return (
      <span
        className="inline-flex size-7 items-center justify-center rounded-full bg-amber-400 shadow-sm ring-1 ring-amber-500/30"
        title="Ready to send"
        aria-label="Ready to send"
      />
    );
  }

  return (
    <span
      className="inline-flex size-7 items-center justify-center rounded-full bg-muted ring-1 ring-border"
      title="Pending"
      aria-label="Pending"
    />
  );
}

function PayslipTable({
  rows,
  mode,
  showEmployee,
  onPreview,
  onSend,
  viewingId,
}: {
  rows: PayslipListItem[];
  mode: "employee" | "hr";
  showEmployee?: boolean;
  onPreview: (row: PayslipListItem) => void;
  onSend?: (row: PayslipListItem) => void;
  viewingId?: string | null;
}) {
  if (mode === "hr") {
    return (
      <table className="w-full min-w-[72rem] text-sm">
        <thead className={TABLE_HEADER_STICKY_CLASS}>
          <tr className={TABLE_HEADER_ROW_CLASS}>
            <th className={TABLE_HEADER_CELL_CLASS}>Employee</th>
            <th className={TABLE_HEADER_CELL_CLASS}>Department</th>
            <th className={TABLE_HEADER_CELL_CLASS}>Monthly salary</th>
            <th className={TABLE_HEADER_CELL_CLASS}>Attendance earnings</th>
            <th className={TABLE_HEADER_CELL_CLASS}>Deductions</th>
            <th className={TABLE_HEADER_CELL_CLASS}>Net salary</th>
            <th className={TABLE_HEADER_CELL_CLASS}>Reimb.</th>
            <th className={TABLE_HEADER_CELL_CLASS}>Final payable</th>
            <th className={TABLE_HEADER_CELL_CLASS}>Status</th>
            <th className={cn(TABLE_HEADER_CELL_CLASS, "text-right")}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const amounts = payslipAmounts(row);
            return (
            <tr key={row.payrollItemId ?? row.id} className="border-b last:border-0">
              <td className="min-w-[14rem] px-4 py-3">
                <div className="truncate whitespace-nowrap font-medium" title={row.employeeName}>
                  {row.employeeName}
                </div>
                <div
                  className="truncate whitespace-nowrap text-xs text-muted-foreground"
                  title={row.employeeCode}
                >
                  {row.employeeCode}
                </div>
              </td>
              <td className="px-4 py-3">{row.departmentName ?? "—"}</td>
              <td className="px-4 py-3 tabular-nums">{formatCurrency(amounts.monthlySalary)}</td>
              <td className="px-4 py-3 tabular-nums">
                {formatCurrency(amounts.attendanceEarnings)}
              </td>
              <td className="px-4 py-3 tabular-nums">{formatCurrency(amounts.deductions)}</td>
              <td className="px-4 py-3 tabular-nums font-medium">
                {formatCurrency(amounts.netSalary)}
              </td>
              <td className="px-4 py-3 tabular-nums">
                {amounts.reimbursement > 0 ? formatCurrency(amounts.reimbursement) : "—"}
              </td>
              <td className="px-4 py-3 tabular-nums font-medium">
                {formatCurrency(amounts.finalPayable)}
              </td>
              <td className="px-4 py-3">
                <PayslipStatusIndicator row={row} />
              </td>
              <td className="px-4 py-3">
                <PayslipRowActions
                  row={row}
                  mode={mode}
                  onPreview={onPreview}
                  onSend={onSend}
                  viewingId={viewingId}
                />
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-full min-w-[56rem] text-sm">
      <thead className={TABLE_HEADER_STICKY_CLASS}>
        <tr className={TABLE_HEADER_ROW_CLASS}>
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
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [sendTarget, setSendTarget] = useState<PayslipListItem | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [monthValue, setMonthValue] = useState(String(month));
  const [yearValue, setYearValue] = useState(String(year));
  const statusValue = searchParams.get("payslipStatus") ?? "all";

  useEffect(() => {
    setMonthValue(String(month));
    setYearValue(String(year));
  }, [month, year]);

  const yearOptions = useMemo(() => getHrmsYears(), []);

  const updateParams = useCallback(
    (nextMonth: string, nextYear: string, extra?: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", nextMonth);
      params.set("year", nextYear);
      if (statusValue && statusValue !== "all") params.set("payslipStatus", statusValue);
      else params.delete("payslipStatus");
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
    [basePath, router, searchParams, startTransition, statusValue],
  );

  const underReview =
    mode === "employee"
      ? history.data.find((row) => row.availability === "under_review")
      : undefined;

  function openPreview(row: PayslipListItem) {
    if (mode !== "hr") {
      setActivePayslipId(row.id);
      setPreviewOpen(true);
      return;
    }
    if (!row.payrollItemId) return;
    setViewingId(row.payrollItemId);
    void (async () => {
      const result = await ensurePayrollItemPayslipAction(row.payrollItemId!);
      setViewingId(null);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setActivePayslipId(result.data);
      setPreviewOpen(true);
    })();
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
            {mode === "hr" ? (
              <Select
                value={statusValue}
                onValueChange={(value) => {
                  if (!value) return;
                  updateParams(monthValue, yearValue, {
                    payslipStatus: value === "all" ? undefined : value,
                  });
                }}
              >
                <SelectTrigger className="w-full lg:w-44">
                  <SelectValue>
                    {statusValue === "sent"
                      ? "Sent"
                      : statusValue === "pending"
                        ? "Pending"
                        : "All statuses"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
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
              onSend={mode === "hr" ? setSendTarget : undefined}
              viewingId={viewingId}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {mode === "hr"
                ? `No payroll found for ${getMonthFilterLabel(monthValue)} ${yearValue}. Open Company Payroll for this month to calculate amounts, then send payslips here.`
                : `No payslips found for ${getMonthFilterLabel(monthValue)} ${yearValue}.`}
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
        <>
          <EmployeeDetailPayslipDrawer
            payslipId={activePayslipId}
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            canEmail
          />
          <PayrollSendPayslipDialog
            target={
              sendTarget?.payrollItemId
                ? {
                    payrollItemId: sendTarget.payrollItemId,
                    employeeName: sendTarget.employeeName,
                    employeeCode: sendTarget.employeeCode,
                    netPay: sendTarget.netSalary,
                    periodLabel: formatPayrollMonthLabel(sendTarget.payrollMonth),
                    payslipSent: sendTarget.payslipSent,
                  }
                : null
            }
            open={Boolean(sendTarget)}
            onOpenChange={(open) => {
              if (!open) setSendTarget(null);
            }}
            onSent={() => {
              setSendTarget(null);
              router.refresh();
            }}
          />
        </>
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
