import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { generatePayslipPdfBytes } from "@/lib/payroll/services/payslip-pdf";
import type { PayslipDetail } from "@/types/payroll";

const BUCKET = "employee-documents";

export async function storePayslipPdf(
  supabase: AuthSupabaseClient,
  payslip: PayslipDetail,
): Promise<string> {
  const pdfBytes = await generatePayslipPdfBytes(payslip);
  const storagePath = `payslips/${payslip.employee.id}/${payslip.payslipNumber}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
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

  return storagePath;
}
