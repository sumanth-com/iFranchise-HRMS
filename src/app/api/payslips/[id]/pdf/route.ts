import { NextResponse } from "next/server";

import { getPayslipById } from "@/lib/payroll/services/payroll-mutations";
import { generatePayslipPdfBytes } from "@/lib/payroll/services/payslip-pdf";
import { canAccessPayslipDuringReview } from "@/lib/payroll/services/payslip-publication";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const profile = await requireServerAnyPermission(["payslip.view"]);
    const { id } = await context.params;
    const supabase = await createClient();
    const payslip = await getPayslipById(supabase, profile, id);

    if (!payslip) {
      return NextResponse.json({ message: "Payslip not found" }, { status: 404 });
    }

    if (!payslip.canEmployeeAccess && !canAccessPayslipDuringReview(profile.permissionCodes)) {
      return NextResponse.json(
        { message: "Payslip is under HR review and not yet available" },
        { status: 403 },
      );
    }

    const pdfBytes = await generatePayslipPdfBytes(payslip);
    const filename = `payslip-${payslip.payslipNumber}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ message: "Unable to generate payslip PDF" }, { status: 500 });
  }
}
