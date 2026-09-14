import Image from "next/image";
import { useId } from "react";

import brandLogo from "@/assets/Logo.png";
import {
  PAYSLIP_DESIGN,
  PAYSLIP_FOOTER_TOP_WAVE,
  PAYSLIP_HEADER_BOTTOM_WAVE,
  PAYSLIP_WAVE_PATHS,
  payslipPurpleGradientCss,
} from "@/lib/payroll/services/payslip-design";
import { amountToIndianWords } from "@/lib/payroll/services/amount-in-words";
import {
  formatPayslipMonthTitle,
  formatPayslipPaymentDate,
  getPayslipFooterLines,
  getPayslipInfoRows,
  getPayslipNotes,
  getPayslipPaymentDetails,
} from "@/lib/payroll/services/payslip-document-helpers";
import { resolvePayslipDisplayTotals } from "@/lib/payroll/services/payroll-utils";
import { cn } from "@/lib/utils";
import type { PayslipDetail } from "@/types/payroll";

/**
 * Official HRMS payslip document (screen + print).
 * Pair with `generatePayslipPdfBytes` for downloads/email — same design system.
 * Do not fork alternate payslip layouts.
 */

function formatAmountIndian(value: number | undefined | null): string {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Premium flowing vertical ribbons — right side only, simple & clean. */
function PayslipWaveDecor({
  className,
  mirror = false,
}: {
  className?: string;
  mirror?: boolean;
}) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-y-0 right-0 h-full w-[52%] sm:w-[48%]",
        className,
      )}
      viewBox="0 0 360 360"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden
      style={mirror ? { transform: "scaleY(-1)" } : undefined}
    >
      <defs>
        <linearGradient id={`pw-a-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id={`pw-b-${uid}`} x1="10%" y1="0%" x2="100%" y2="90%">
          <stop offset="0%" stopColor="#ddd6fe" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {PAYSLIP_WAVE_PATHS.map((wave, index) => (
        <path
          key={index}
          d={wave.d}
          fill={
            index === 0
              ? `url(#pw-a-${uid})`
              : index === 1
                ? `url(#pw-b-${uid})`
                : "#ffffff"
          }
          opacity={index === 2 ? wave.opacity : undefined}
        />
      ))}
    </svg>
  );
}

export function PayslipTemplate({
  payslip,
  className = "",
}: {
  payslip: PayslipDetail;
  className?: string;
}) {
  const monthTitle = formatPayslipMonthTitle(payslip.payrollMonth);
  const paymentDate = formatPayslipPaymentDate(payslip);
  const infoRows = getPayslipInfoRows(payslip);
  const paymentDetails = getPayslipPaymentDetails(payslip);
  const notes = getPayslipNotes(payslip);
  const footer = getPayslipFooterLines(payslip);

  const { earnings, deductions, grossEarnings, totalDeductions, netPay } =
    resolvePayslipDisplayTotals({
      breakdown: payslip.breakdown,
      basicSalary: payslip.basicSalary,
      totalAllowances: payslip.totalAllowances,
      grossSalary: payslip.grossSalary,
      totalDeductions: payslip.totalDeductions,
      employmentType: payslip.employee.employmentType,
    });

  const maxRows = Math.max(earnings.length, deductions.length, 1);

  return (
    <article
      id="payslip-print"
      className={cn(
        "payslip-doc mx-auto w-full max-w-[210mm] overflow-hidden bg-white text-slate-900 shadow-md print:max-w-none print:shadow-none",
        className,
      )}
      style={{ fontFamily: "var(--font-sans), 'Segoe UI', Arial, sans-serif" }}
    >
      <header className="payslip-doc-header relative isolate overflow-hidden text-white">
        <div className="absolute inset-0" style={{ background: payslipPurpleGradientCss(125) }} />
        <PayslipWaveDecor />

        <div className="relative z-10 flex flex-col gap-6 px-6 pb-10 pt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:px-8 sm:pb-12 sm:pt-7">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[22%] sm:h-12 sm:w-12">
                <Image
                  src={brandLogo}
                  alt={PAYSLIP_DESIGN.brandName}
                  width={48}
                  height={48}
                  className="h-full w-full object-contain"
                  priority
                />
              </span>
              <div className="min-w-0 leading-none">
                <p className="truncate text-[1.35rem] font-black tracking-[-0.03em] text-white sm:text-[1.5rem]">
                  {PAYSLIP_DESIGN.brandName}
                </p>
                <p className="mt-1.5 truncate text-[0.58rem] font-bold uppercase tracking-[0.2em] text-white/80 sm:text-[0.62rem]">
                  {PAYSLIP_DESIGN.brandTagline}
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-xl break-words text-[11px] leading-relaxed text-white/88 sm:text-xs">
              <span className="text-white/70">Payslip no.</span>{" "}
              <span className="font-semibold text-white">{payslip.payslipNumber}</span>
              <span className="mx-2 text-white/45">/</span>
              <span className="text-white/70">Payment date</span>{" "}
              <span className="font-semibold text-white">{paymentDate}</span>
            </p>
          </div>

          <div className="relative z-10 shrink-0 text-left sm:pt-1 sm:text-right">
            <p className="text-[1.85rem] font-black uppercase leading-none tracking-[-0.03em] text-white drop-shadow-[0_1px_8px_rgba(26,10,114,0.35)] sm:text-[2.15rem]">
              PAYSLIP
            </p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.08em] text-white/92 sm:text-base">
              {monthTitle}
            </p>
          </div>
        </div>

        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 w-full text-white sm:h-10"
          viewBox="0 0 1000 80"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={PAYSLIP_HEADER_BOTTOM_WAVE} fill="currentColor" />
        </svg>
      </header>

      <div className="space-y-6 px-6 pb-6 pt-1 sm:space-y-7 sm:px-8 sm:pb-8">
        <section>
          <h2
            className="mb-3 text-sm font-bold"
            style={{ color: PAYSLIP_DESIGN.sectionTitle }}
          >
            Employee information
          </h2>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            {infoRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className={cn(
                  "grid grid-cols-1 sm:grid-cols-3",
                  rowIndex < infoRows.length - 1 && "border-b border-slate-200",
                )}
              >
                {row.map((cell, cellIndex) => (
                  <div
                    key={`${cell.label}-${cellIndex}`}
                    className={cn(
                      "min-w-0 px-3 py-3 sm:px-4",
                      cellIndex < row.length - 1 && "sm:border-r sm:border-slate-200",
                      cellIndex < row.length - 1 && "border-b border-slate-100 sm:border-b-0",
                    )}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: `${PAYSLIP_DESIGN.labelMuted}cc` }}
                    >
                      {cell.label}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold leading-snug text-slate-900">
                      {cell.value}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2
            className="mb-3 text-sm font-bold"
            style={{ color: PAYSLIP_DESIGN.sectionTitle }}
          >
            Earnings and deductions
          </h2>
          <div className="overflow-x-auto overflow-y-hidden rounded-lg border border-slate-200">
            <table className="w-full min-w-[36rem] table-fixed border-collapse text-sm">
              <thead>
                <tr
                  className="text-[10px] font-bold uppercase tracking-[0.12em] text-white"
                  style={{ backgroundColor: PAYSLIP_DESIGN.purpleBand }}
                >
                  <th className="w-[32%] border-b border-r border-white/15 px-3 py-2.5 text-left">
                    Earnings
                  </th>
                  <th className="w-[18%] border-b border-r border-white/15 px-3 py-2.5 text-right">
                    Amount (₹)
                  </th>
                  <th className="w-[32%] border-b border-r border-white/15 px-3 py-2.5 text-left">
                    Deductions
                  </th>
                  <th className="w-[18%] border-b border-white/15 px-3 py-2.5 text-right">
                    Amount (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxRows }).map((_, index) => {
                  const earning = earnings[index];
                  const deduction = deductions[index];
                  return (
                    <tr key={index} className="align-top">
                      <td className="border-b border-r border-slate-100 px-3 py-2 font-medium text-slate-800">
                        <span className="break-words">{earning?.label ?? ""}</span>
                      </td>
                      <td className="border-b border-r border-slate-100 px-3 py-2 text-right tabular-nums text-slate-800">
                        {earning ? formatAmountIndian(earning.amount) : ""}
                      </td>
                      <td className="border-b border-r border-slate-100 px-3 py-2 font-medium text-slate-800">
                        <span className="break-words">{deduction?.label ?? ""}</span>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums text-slate-800">
                        {deduction ? formatAmountIndian(deduction.amount) : ""}
                      </td>
                    </tr>
                  );
                })}
                <tr
                  className="font-bold text-slate-900"
                  style={{ backgroundColor: PAYSLIP_DESIGN.highlightRow }}
                >
                  <td className="border-r border-slate-200 px-3 py-2.5">Gross earnings</td>
                  <td className="border-r border-slate-200 px-3 py-2.5 text-right tabular-nums">
                    {formatAmountIndian(grossEarnings)}
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2.5">Total deductions</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatAmountIndian(totalDeductions)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section
          className="relative overflow-hidden rounded-2xl px-5 py-4 text-white sm:px-6 sm:py-5"
          style={{ background: payslipPurpleGradientCss(115) }}
        >
          <p className="relative z-10 break-words text-center text-[13px] font-semibold leading-relaxed tracking-[-0.01em] tabular-nums sm:text-[15px]">
            <span className="whitespace-nowrap">₹{formatAmountIndian(grossEarnings)}</span>
            <span className="text-white/80"> (Gross Earnings)</span>
            <span className="mx-1.5 text-white/90">−</span>
            <span className="whitespace-nowrap">₹{formatAmountIndian(totalDeductions)}</span>
            <span className="text-white/80"> (Deductions)</span>
            <span className="mx-1.5 text-white/90">=</span>
            <span className="whitespace-nowrap font-bold">₹{formatAmountIndian(netPay)}</span>
            <span className="font-bold text-white/90"> (Net Pay)</span>
          </p>
        </section>

        <p className="break-words text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">Amount in words</span>{" "}
          <span className="capitalize">{amountToIndianWords(netPay)}</span>
        </p>

        <section>
          <div
            className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-3"
            style={{ backgroundColor: PAYSLIP_DESIGN.panelBg }}
          >
            {paymentDetails.map((detail) => (
              <div key={detail.label} className="min-w-0">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: `${PAYSLIP_DESIGN.labelMuted}cc` }}
                >
                  {detail.label}
                </p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                  {detail.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2
            className="mb-2 text-sm font-bold"
            style={{ color: PAYSLIP_DESIGN.sectionTitle }}
          >
            Notes
          </h2>
          <ol className="space-y-1.5 pl-4 text-xs leading-relaxed text-slate-600">
            {notes.map((note, index) => (
              <li key={index} className="list-decimal break-words pl-1">
                {note}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <footer className="payslip-doc-footer relative isolate overflow-hidden text-white">
        <div className="absolute inset-0" style={{ background: payslipPurpleGradientCss(125) }} />
        <PayslipWaveDecor mirror />

        <svg
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-7 w-full text-white sm:h-8"
          viewBox="0 0 1000 70"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={PAYSLIP_FOOTER_TOP_WAVE} fill="currentColor" />
        </svg>

        <div className="relative z-10 flex flex-col gap-3 px-6 pb-5 pt-10 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-8 sm:pb-6 sm:pt-11">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-wide text-white">
              {footer.companyName}
            </p>
            {footer.addressLines.map((line) => (
              <p
                key={line}
                className="mt-1 break-words text-[11px] leading-relaxed text-white/82 sm:whitespace-nowrap"
              >
                {line}
              </p>
            ))}
            {footer.contactLine ? (
              <p className="mt-1 break-words text-[11px] leading-relaxed text-white/75 sm:whitespace-nowrap">
                {footer.contactLine}
              </p>
            ) : null}
          </div>
          <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-white/90 sm:pt-0.5 sm:text-right">
            {PAYSLIP_DESIGN.confidentialLabel}
          </p>
        </div>
      </footer>
    </article>
  );
}
