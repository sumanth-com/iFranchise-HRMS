"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import {
  Archive,
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
import { Button, buttonVariants } from "@/components/common/button";
import { Input } from "@/components/common/input";
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
import type {
  PayslipHistoryResult,
  PayslipListItem,
} from "@/types/payroll";
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
};

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value.length === 10 ? value : value.slice(0, 10)), "dd MMM yyyy");
  } catch {
    return "—";
  }
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
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Payslip-${row.payslipNumber}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to download payslip PDF");
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
      toast.success("Payslip sent to registered email");
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
              className={cn(
                "border-b last:border-0",
                row.isArchived && "opacity-60",
              )}
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

export function PayslipHistoryView({ history, mode, basePath }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [activePayslipId, setActivePayslipId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
  const monthDefault = searchParams.get("month") ?? "all";

  const underReview = history.data.find((row) => row.availability === "under_review");

  function openPreview(id: string) {
    setActivePayslipId(id);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <History className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Payroll Archive
            </span>
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Payslips", value: String(history.stats.totalPayslips) },
          {
            label: "Years Available",
            value: String(history.stats.yearsAvailable.length || "—"),
          },
          {
            label: "Latest Salary",
            value:
              history.stats.latestSalary != null
                ? formatCurrency(history.stats.latestSalary)
                : "—",
          },
          {
            label: "Highest Salary",
            value:
              history.stats.highestSalary != null
                ? formatCurrency(history.stats.highestSalary)
                : "—",
          },
          {
            label: "Latest Published",
            value: fmtDate(history.stats.latestPublished),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-card px-4 py-3 shadow-sm"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search month, payslip number, year…"
              defaultValue={searchParams.get("search") ?? ""}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  updateParams({ search: event.currentTarget.value || undefined });
                }
              }}
            />
          </div>
          <Select
            defaultValue={yearDefault}
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
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="current">Current Year</SelectItem>
              <SelectItem value="last">Last Year</SelectItem>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            defaultValue={monthDefault}
            onValueChange={(value) => {
              const month = value && value !== "all" ? value : undefined;
              updateParams({ month });
            }}
          >
            <SelectTrigger className="w-full lg:w-44">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((label, index) => (
                <SelectItem key={label} value={String(index + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mode === "hr" ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                updateParams({
                  includeArchived: searchParams.get("includeArchived") ? undefined : "true",
                })
              }
            >
              <Archive className="size-4" />
              {searchParams.get("includeArchived") ? "Hide Archived" : "Show Archived"}
            </Button>
          ) : null}
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

      <EmployeePayslipDrawer
        payslipId={activePayslipId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
