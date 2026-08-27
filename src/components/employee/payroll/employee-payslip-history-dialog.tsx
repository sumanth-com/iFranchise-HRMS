"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYROLL_STATUS_LABELS } from "@/lib/payroll/constants";
import type { PayrollStatus, PayslipListItem } from "@/types/payroll";
import { cn } from "@/lib/utils";

const FILTER_SELECT_CONTENT_CLASS =
  "z-[100] min-w-[var(--anchor-width)] w-max max-w-[min(100vw-2rem,12rem)]";

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

const STATUS_STYLES: Record<PayrollStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  processing: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  processed: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  approved: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-destructive/10 text-destructive",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslips: PayslipListItem[];
  money: (value: number) => string;
  fmtDate: (value: string | null) => string;
  fmtMonth: (value: string) => string;
  onViewPayslip: (id: string) => void;
};

function parsePayrollMonth(value: string): { year: number; month: number } {
  const [yearPart, monthPart] = value.split("-");
  return {
    year: Number(yearPart) || 0,
    month: Number(monthPart) || 0,
  };
}

function getYearFilterLabel(value: string): string {
  if (value === "all") return "All Years";
  if (value === "current") return "Current Year";
  if (value === "last") return "Last Year";
  return value;
}

function getMonthFilterLabel(value: string): string {
  if (value === "all") return "All Months";
  const index = Number(value) - 1;
  return MONTHS[index] ?? "All Months";
}

function StatusPill({ status }: { status: PayrollStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {PAYROLL_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function EmployeePayslipHistoryDialog({
  open,
  onOpenChange,
  payslips,
  money,
  fmtDate,
  fmtMonth,
  onViewPayslip,
}: Props) {
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  useEffect(() => {
    if (!open) {
      setYearFilter("all");
      setMonthFilter("all");
    }
  }, [open]);

  const currentYear = new Date().getFullYear();

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    payslips.forEach((row) => {
      const { year } = parsePayrollMonth(row.payrollMonth);
      if (year) years.add(year);
    });
    if (years.size === 0) {
      return [currentYear, currentYear - 1, currentYear - 2];
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [payslips, currentYear]);

  const filteredPayslips = useMemo(() => {
    return payslips.filter((row) => {
      const { year, month } = parsePayrollMonth(row.payrollMonth);

      if (yearFilter === "current" && year !== currentYear) return false;
      if (yearFilter === "last" && year !== currentYear - 1) return false;
      if (
        yearFilter !== "all" &&
        yearFilter !== "current" &&
        yearFilter !== "last" &&
        year !== Number(yearFilter)
      ) {
        return false;
      }

      if (monthFilter !== "all" && month !== Number(monthFilter)) return false;

      return true;
    });
  }, [payslips, yearFilter, monthFilter, currentYear]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Payslip History"
      description="All published salary statements during your employment."
      contentClassName="sm:max-w-4xl"
      cancelLabel="Close"
    >
      {payslips.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={yearFilter}
              onValueChange={(value) => setYearFilter(value ?? "all")}
            >
              <SelectTrigger size="sm" className="h-9 w-[8.5rem] shrink-0">
                <SelectValue placeholder="Year">
                  {(value) => getYearFilterLabel(String(value ?? "all"))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                align="start"
                side="bottom"
                alignItemWithTrigger={false}
                className={FILTER_SELECT_CONTENT_CLASS}
              >
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
              value={monthFilter}
              onValueChange={(value) => setMonthFilter(value ?? "all")}
            >
              <SelectTrigger size="sm" className="h-9 w-[9rem] shrink-0">
                <SelectValue placeholder="Month">
                  {(value) => getMonthFilterLabel(String(value ?? "all"))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                align="start"
                side="bottom"
                alignItemWithTrigger={false}
                className={FILTER_SELECT_CONTENT_CLASS}
              >
                <SelectItem value="all">All Months</SelectItem>
                {MONTHS.map((label, index) => (
                  <SelectItem key={label} value={String(index + 1)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(yearFilter !== "all" || monthFilter !== "all") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  setYearFilter("all");
                  setMonthFilter("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {filteredPayslips.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="bg-blue-600 bg-gradient-to-r from-blue-600 to-violet-600">
                    <th className="h-11 whitespace-nowrap px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Month</th>
                    <th className="h-11 whitespace-nowrap px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Payslip #</th>
                    <th className="h-11 whitespace-nowrap px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Gross</th>
                    <th className="h-11 whitespace-nowrap px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Net</th>
                    <th className="h-11 whitespace-nowrap px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Credit Date</th>
                    <th className="h-11 whitespace-nowrap px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Status</th>
                    <th className="h-11 whitespace-nowrap px-4 py-3 text-right align-middle text-xs font-semibold uppercase tracking-wide text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayslips.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{fmtMonth(row.payrollMonth)}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{row.payslipNumber}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{money(row.grossSalary)}</td>
                      <td className="py-2.5 pr-3 tabular-nums font-medium">
                        {money(row.netSalary)}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {fmtDate(row.salaryCreditDate)}
                      </td>
                      <td className="py-2.5 pr-3">
                        {row.availability === "under_review" ? (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            HR Review
                          </span>
                        ) : (
                          <StatusPill status={row.payrollStatus} />
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={!row.canEmployeeAccess}
                            onClick={() => onViewPayslip(row.id)}
                          >
                            <FileText className="size-3.5" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={!row.canEmployeeAccess}
                            onClick={async () => {
                              if (!row.canEmployeeAccess) return;
                              try {
                                const response = await fetch(`/api/payslips/${row.id}/pdf`);
                                if (!response.ok) throw new Error("Download failed");
                                const blob = await response.blob();
                                const url = URL.createObjectURL(blob);
                                const anchor = document.createElement("a");
                                anchor.href = url;
                                anchor.download = `payslip-${row.payslipNumber}.pdf`;
                                anchor.click();
                                URL.revokeObjectURL(url);
                              } catch {
                                onViewPayslip(row.id);
                              }
                            }}
                          >
                            <Download className="size-3.5" />
                            PDF
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No payslips match the selected filters.
            </p>
          )}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">No payslips issued yet.</p>
      )}
    </Modal>
  );
}
