/**
 * Pure identity helpers for payslip → employee_documents mirroring.
 * Kept free of server-only so unit tests can import them directly.
 */

const PAYSLIP_ID_NOTE_RE = /payslip_id:([0-9a-f-]{36})/i;

export function payrollPeriodParts(payrollMonth: string): {
  year: number;
  month: number;
  periodNotes: string;
  /** First day of payroll month — used as document issued_date (not sync date). */
  issuedDate: string;
} | null {
  const normalized =
    payrollMonth.length === 7
      ? `${payrollMonth}-01`
      : payrollMonth.length >= 10
        ? payrollMonth.slice(0, 10)
        : payrollMonth;
  const match = normalized.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return {
    year,
    month,
    periodNotes: `period:${match[1]}-${match[2]}`,
    issuedDate: `${match[1]}-${match[2]}-01`,
  };
}

/** Notes encode both payslip identity and payroll period for idempotent Documents sync. */
export function buildPayslipDocumentNotes(payslipId: string, periodNotes: string): string {
  return `payslip_id:${payslipId}|${periodNotes}`;
}

export function extractPayslipIdFromDocumentNotes(notes: string | null | undefined): string | null {
  const match = String(notes ?? "").match(PAYSLIP_ID_NOTE_RE);
  return match?.[1]?.toLowerCase() ?? null;
}
