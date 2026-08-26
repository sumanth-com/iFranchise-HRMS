"use client";

import Link from "next/link";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Award,
  Banknote,
  CalendarDays,
  CircleDollarSign,
  Download,
  FileText,
  Gift,
  History,
  IndianRupee,
  Landmark,
  ReceiptText,
  Wallet,
} from "lucide-react";

import {
  EmployeeSectionCard,
  EmployeeStatCard,
} from "@/components/employee/dashboard/employee-module-primitives";
import { EmployeePayslipHistoryDialog } from "@/components/employee/payroll/employee-payslip-history-dialog";
import { EmployeePayslipDrawer } from "@/components/employee/payroll/employee-payslip-drawer";
import { PaymentTimeline } from "@/components/employee/payroll/payment-timeline";
import { EarningsDeductionsTable } from "@/components/payroll/earnings-deductions-table";
import { Button } from "@/components/common/button";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import {
  BONUS_STATUS_LABELS,
  BONUS_TYPE_LABELS,
  PAYROLL_STATUS_LABELS,
  REIMBURSEMENT_CATEGORY_LABELS,
  REIMBURSEMENT_STATUS_LABELS,
} from "@/lib/payroll/constants";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import { formatReviewBannerMessage } from "@/lib/payroll/services/payslip-publication";
import type { EmployeePayrollData } from "@/types/employee-payroll";
import type {
  BonusItem,
  PayrollStatus,
  PayslipListItem,
  ReimbursementItem,
} from "@/types/payroll";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<PayrollStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  processing: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  processed: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  approved: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-destructive/10 text-destructive",
};

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

function fmtDate(value: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value.length === 7 ? `${value}-01` : value), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

function fmtMonth(value: string): string {
  if (!value) return "—";
  try {
    return format(parseISO(value.length === 7 ? `${value}-01` : value), "MMMM yyyy");
  } catch {
    return value;
  }
}

export function EmployeePayrollView({
  data,
  policyHref = EMPLOYEE_ROUTES.payrollPolicy,
  showPolicyLink = true,
  showHeaderActions = true,
  showPageHeading = true,
}: {
  data: EmployeePayrollData;
  policyHref?: string;
  showPolicyLink?: boolean;
  showHeaderActions?: boolean;
  showPageHeading?: boolean;
}) {
  const [activePayslipId, setActivePayslipId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const money = (value: number) => formatCurrency(value, data.currencyCode);
  const latestPayslip = data.payslips.find((row) => row.canEmployeeAccess) ?? null;

  function openPayslip(id: string) {
    setActivePayslipId(id);
    setDrawerOpen(true);
  }

  function openPayslipFromHistory(id: string) {
    setHistoryOpen(false);
    openPayslip(id);
  }

  const header = showPageHeading ? (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Payroll</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View salary, payslips, earnings, deductions and payment history.
        </p>
      </div>
      {showHeaderActions ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            disabled={!latestPayslip}
            onClick={() => latestPayslip && openPayslip(latestPayslip.id)}
          >
            <Download className="size-4" />
            Latest Payslip
          </Button>
          {showPolicyLink ? (
            <Button
              variant="outline"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href={policyHref} />}
            >
              <FileText className="size-4" />
              Payroll Policy
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  ) : showHeaderActions ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        variant="outline"
        className="gap-1.5"
        disabled={!latestPayslip}
        onClick={() => latestPayslip && openPayslip(latestPayslip.id)}
      >
        <Download className="size-4" />
        Latest Payslip
      </Button>
      {showPolicyLink ? (
        <Button
          variant="outline"
          className="gap-1.5"
          nativeButton={false}
          render={<Link href={policyHref} />}
        >
          <FileText className="size-4" />
          Payroll Policy
        </Button>
      ) : null}
    </div>
  ) : null;

  if (!data.hasAnyData) {
    return (
      <>
        {header}
        <section className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center shadow-sm">
          <span className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IndianRupee className="size-8" />
          </span>
          <h2 className="text-base font-semibold">
            Your payroll information is not available yet
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Once HR processes your first payroll, your payslips, salary breakdown and
            payment history will appear here. Please contact HR if you believe this is
            incorrect.
          </p>
        </section>
      </>
    );
  }

  const breakdown = data.displaySummary;
  const earnings = breakdown.earnings;
  const deductions = breakdown.deductions;
  const gross = breakdown.grossSalary;
  const totalDeductions = breakdown.totalDeductions;
  const net = breakdown.netSalary;
  const usingStructure = breakdown.usingStructure;
  const extrasIncluded = breakdown.extrasIncluded;
  return (
    <>
      {header}

      {data.pendingPromotion ? (
        <section className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-card to-card px-4 py-4 shadow-sm dark:border-amber-400/45 dark:from-amber-500/20 dark:via-[#0a0f1c] dark:to-[#060914] dark:shadow-[0_0_24px_-8px_rgba(251,191,36,0.35)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500"
          />
          <div className="relative flex items-start gap-3 pl-2">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/40">
              <Award className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-tight text-amber-950 dark:text-amber-200">
                Promotion pending approval
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/85 dark:text-white/90">
                {data.pendingPromotion.recommendedDesignation
                  ? `Proposed role: ${data.pendingPromotion.recommendedDesignation}. `
                  : null}
                {data.pendingPromotion.currentSalary != null &&
                data.pendingPromotion.recommendedSalary != null
                  ? `Proposed salary: ${money(data.pendingPromotion.currentSalary)} → ${money(
                      data.pendingPromotion.recommendedSalary,
                    )}. `
                  : data.pendingPromotion.recommendedSalary != null
                    ? `Proposed salary: ${money(data.pendingPromotion.recommendedSalary)}. `
                    : null}
                Payroll uses your current approved salary until the CEO approves this promotion.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <EmployeeStatCard
          label="Current Net Salary"
          value={data.kpis.currentNetSalary != null ? money(data.kpis.currentNetSalary) : "—"}
          hint="Take-home pay"
          icon={Wallet}
          accent="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <EmployeeStatCard
          label="Gross Salary"
          value={
            data.kpis.currentGrossSalary != null ? money(data.kpis.currentGrossSalary) : "—"
          }
          hint="Before deductions"
          icon={Banknote}
          accent="text-sky-600 dark:text-sky-400"
          iconBg="bg-sky-500/10"
        />
        <EmployeeStatCard
          label="Last Payment"
          value={fmtDate(data.kpis.lastPaymentDate)}
          hint="Salary credited"
          icon={CalendarDays}
          accent="text-violet-600 dark:text-violet-400"
          iconBg="bg-violet-500/10"
        />
        <EmployeeStatCard
          label="Total Deductions"
          value={money(totalDeductions)}
          hint={
            extrasIncluded
              ? "Includes bonuses and claims"
              : usingStructure
                ? "From salary structure"
                : "Latest payslip"
          }
          icon={ReceiptText}
          accent="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
        />
        <EmployeeStatCard
          label={`${data.ytd.financialYearLabel} Net Pay`}
          value={money(data.ytd.net)}
          hint={`${data.ytd.monthsCount} month${data.ytd.monthsCount === 1 ? "" : "s"} · take-home`}
          icon={CircleDollarSign}
          accent="text-teal-600 dark:text-teal-400"
          iconBg="bg-teal-500/10"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-3 xl:items-stretch">
        <div className="flex flex-col gap-4 xl:col-span-2">
          <EmployeeSectionCard
            title={
              extrasIncluded || !usingStructure
                ? "Current Payroll Summary"
                : "Salary Structure"
            }
            description={
              extrasIncluded
                ? `${fmtMonth(breakdown.periodMonth ?? "")} · Includes bonuses and expense claims`
                : usingStructure
                  ? "Based on your current salary structure. Payslips appear once payroll is processed."
                  : `${fmtMonth(data.latest?.payrollMonth ?? "")} · Payslip ${
                      data.latest?.payslipNumber ?? ""
                    }`
            }
            action={
              data.latest &&
              breakdown.periodMonth &&
              data.latest.payrollMonth.slice(0, 7) === breakdown.periodMonth ? (
                <StatusPill status={data.latest.payrollStatus} />
              ) : null
            }
            bodyClassName="flex flex-col gap-4"
          >
            <EarningsDeductionsTable
              variant="dashboard"
              earnings={earnings}
              deductions={deductions}
              grossSalary={gross}
              totalDeductions={totalDeductions}
              money={money}
            />

            <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="text-muted-foreground">Gross</span>
                <span className="font-medium tabular-nums">{money(gross)}</span>
                <span className="text-muted-foreground">−</span>
                <span className="text-muted-foreground">Deductions</span>
                <span className="font-medium tabular-nums">{money(totalDeductions)}</span>
                <span className="text-muted-foreground">=</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Net Pay</p>
                <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {money(net)}
                </p>
              </div>
            </div>
          </EmployeeSectionCard>

          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <EmployeeSectionCard
              className="h-full"
              title="My Bonuses"
              description="Bonuses awarded to you and their status."
            >
              {data.bonuses.length > 0 ? (
                <ul className="divide-y">
                  {data.bonuses.map((bonus: BonusItem) => (
                    <li key={bonus.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400">
                        <Gift className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {BONUS_TYPE_LABELS[bonus.bonusType] ?? bonus.bonusType}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {fmtMonth(bonus.bonusMonth)}
                          {bonus.reason ? ` · ${bonus.reason}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums">{money(bonus.amount)}</p>
                        <p className="text-[11px] capitalize text-muted-foreground">
                          {BONUS_STATUS_LABELS[bonus.bonusStatus] ?? bonus.bonusStatus}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No bonuses recorded yet.
                </p>
              )}
            </EmployeeSectionCard>

            <EmployeeSectionCard
              className="h-full"
              title="My Reimbursements"
              description="Expense claims and their status."
            >
              {data.reimbursements.length > 0 ? (
                <ul className="divide-y">
                  {data.reimbursements.map((item: ReimbursementItem) => (
                    <li key={item.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        <ReceiptText className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {REIMBURSEMENT_CATEGORY_LABELS[item.category] ?? item.category}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {fmtDate(item.expenseDate)}
                          {item.description ? ` · ${item.description}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums">{money(item.amount)}</p>
                        <p className="text-[11px] capitalize text-muted-foreground">
                          {REIMBURSEMENT_STATUS_LABELS[item.reimbursementStatus] ??
                            item.reimbursementStatus}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No reimbursement claims yet.
                </p>
              )}
            </EmployeeSectionCard>
          </div>
        </div>

        {/* Right column: timeline + bank */}
        <div className="flex flex-col gap-4">
          {data.latestTimeline ? (
            <EmployeeSectionCard
              className="flex flex-1 flex-col"
              bodyClassName="flex flex-1 flex-col justify-center"
              title="Payment Timeline"
            >
              <PaymentTimeline stages={data.latestTimeline.stages} />
            </EmployeeSectionCard>
          ) : null}

          <EmployeeSectionCard title="Bank Details">
            {data.bank ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Landmark className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{data.bank.bankName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {data.bank.accountNumberMasked} · {data.bank.accountType}
                    </p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <Detail label="Account holder" value={data.bank.accountHolderName} />
                  <Detail label="IFSC" value={data.bank.ifscCode} />
                  <Detail label="Branch" value={data.bank.branchName} />
                </dl>
                <p className="pt-1 text-[11px] text-muted-foreground">
                  To update bank details, please contact HR.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No bank account on file. Contact HR to add your salary account.
              </p>
            )}
          </EmployeeSectionCard>
        </div>
      </div>

      {/* Payslip history */}
      <EmployeeSectionCard
        title="Payslip History"
        description="All published salary statements during your employment."
        bodyClassName="overflow-x-auto"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="size-4" />
            View full history
          </Button>
        }
      >
        {data.payslips.some((row) => row.availability === "under_review") ? (
          <div className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
            {formatReviewBannerMessage(
              data.payslips.find((row) => row.availability === "under_review")?.publishedAt ??
                new Date().toISOString(),
            )}
          </div>
        ) : null}
        {data.payslips.length > 0 ? (
          <>
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-violet-600">
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
              {data.payslips.slice(0, 3).map((row: PayslipListItem) => (
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
                        onClick={() => openPayslip(row.id)}
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
                            openPayslip(row.id);
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
          {data.payslips.length > 3 ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Showing 3 most recent ·{" "}
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => setHistoryOpen(true)}
              >
                View all {data.payslips.length} payslips
              </button>
            </p>
          ) : null}
          </>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No payslips issued yet.
          </p>
        )}
      </EmployeeSectionCard>

      <EmployeePayslipHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        payslips={data.payslips}
        money={money}
        fmtDate={fmtDate}
        fmtMonth={fmtMonth}
        onViewPayslip={openPayslipFromHistory}
      />

      <EmployeePayslipDrawer
        payslipId={activePayslipId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        overlaySummary={data.displaySummary}
        overlayPayslipId={data.latest?.id ?? null}
      />
    </>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
