import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { upsertPayslipEmployeeDocument } from "@/lib/payroll/services/payslip-to-employee-document";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PayslipDetail } from "@/types/payroll";

const BUCKET = "employee-documents";

/**
 * Archives the payslip PDF and records its location on the payslip row.
 *
 * The object write uses the service-role client, matching how other system-generated
 * documents are stored (see offer letters). The bucket's INSERT policy requires
 * `documents.upload`, which the payslip permissions deliberately do not imply — an
 * employee emailing their own payslip legitimately lacks it. Authorization for this
 * operation is enforced upstream: a permission check in the server action, plus the
 * publication and ownership checks in `emailPayslip`.
 *
 * The `payslips` row update stays on the caller's client so RLS still decides which
 * payslip rows they may write.
 *
 * After a successful archive, mirrors the PDF into Documents → Payroll & Tax → Payslips
 * (idempotent). Mirror failures are logged and do not fail payslip release/email.
 */
export async function storePayslipPdf(
  supabase: AuthSupabaseClient,
  payslip: PayslipDetail,
  organizationId: string,
  options?: { actorUserId?: string | null },
): Promise<string> {
  const { generatePayslipPdfBytes } = await import("@/lib/payroll/services/payslip-pdf");
  const pdfBytes = await generatePayslipPdfBytes(payslip);
  // Storage policies require every object key to be namespaced by organization id.
  const storagePath = `${organizationId}/payslips/${payslip.employee.id}/${payslip.payslipNumber}.pdf`;

  const { error: uploadError } = await createAdminClient()
    .storage.from(BUCKET)
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: updateError } = await supabase
    .schema("hrms")
    .from("payslips")
    .update({ storage_path: storagePath })
    .eq("id", payslip.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  try {
    await upsertPayslipEmployeeDocument({
      organizationId,
      payslip,
      storagePath,
      fileSizeBytes: pdfBytes.byteLength,
      actorUserId: options?.actorUserId ?? null,
    });
  } catch (error) {
    console.error("[payroll] payslip → employee Documents mirror failed", {
      payslipId: payslip.id,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  return storagePath;
}
