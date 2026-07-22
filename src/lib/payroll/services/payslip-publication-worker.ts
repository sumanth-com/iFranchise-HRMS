import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { notifyEmployee } from "@/lib/notifications/services/notification-service";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { getPayslipById } from "@/lib/payroll/services/payroll-mutations";
import { sendPayslipReadyEmail } from "@/lib/payroll/services/payslip-email-service";
import { storePayslipPdf } from "@/lib/payroll/services/payslip-storage";
import { isPayslipPublishedToEmployee } from "@/lib/payroll/services/payslip-publication";
import { formatPayrollMonthLabel } from "@/lib/payroll/services/payroll-utils";
import type { UserProfile } from "@/types/auth";

export type PayslipPublicationResult = {
  processed: number;
  emailed: number;
  skipped: number;
};

/**
 * Publishes due payslips: stores PDF, sends email, and records notification.
 * Safe to call repeatedly (idempotent via email_sent_at).
 */
export async function processDuePayslipPublications(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  appOrigin: string,
): Promise<PayslipPublicationResult> {
  const now = new Date().toISOString();
  const organizationId = profile.employee.organizationId;

  const { data: dueRows, error } = await supabase
    .schema("hrms")
    .from("payslips")
    .select("id, employee_id, payslip_number, published_at, email_sent_at")
    .is("deleted_at", null)
    .is("email_sent_at", null)
    .lte("published_at", now);

  if (error) throw new Error(error.message);

  let processed = 0;
  let emailed = 0;
  let skipped = 0;

  for (const row of dueRows ?? []) {
    if (!row.published_at || !isPayslipPublishedToEmployee(row.published_at)) {
      skipped += 1;
      continue;
    }

    const payslip = await getPayslipById(supabase, profile, row.id, {
      bypassAccessCheck: true,
    });
    if (!payslip) {
      skipped += 1;
      continue;
    }

    try {
      if (!payslip.storagePath) {
        await storePayslipPdf(supabase, payslip);
      }

      const monthLabel = formatPayrollMonthLabel(payslip.payrollMonth);
      const emailResult = await sendPayslipReadyEmail(payslip, appOrigin);

      await notifyEmployee(supabase, {
        organizationId,
        employeeId: payslip.employee.id,
        title: "Payslip available",
        message: `Your payslip for ${monthLabel} (${payslip.payslipNumber}) is ready to download.`,
        notificationType: "payslip_available",
        module: "payroll",
        priority: "medium",
        actionUrl: PAYROLL_ROUTES.payslipDetail(payslip.id),
        sourceEventKey: `payslip_published:${payslip.id}`,
        templateKey: "payslip_available",
        templateVariables: { month: monthLabel, payslipNumber: payslip.payslipNumber },
        createdBy: profile.userId,
      });

      await supabase
        .schema("hrms")
        .from("payslips")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", payslip.id);

      processed += 1;
      if (emailResult.delivered) emailed += 1;
    } catch (publishError) {
      console.error("[payslip-publication] failed", row.id, publishError);
      skipped += 1;
    }
  }

  return { processed, emailed, skipped };
}
