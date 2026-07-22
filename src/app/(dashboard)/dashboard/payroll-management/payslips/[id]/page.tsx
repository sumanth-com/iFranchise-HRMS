import { notFound } from "next/navigation";

import { PayslipVersionPanel } from "@/components/payroll/payslip-version-panel";
import { PayslipView } from "@/components/payroll/payslip-view";
import { createClient } from "@/lib/supabase/server";
import { canDownloadPayroll } from "@/lib/payroll/constants";
import { listPayslipVersions } from "@/lib/payroll/services/payslip-history-queries";
import { getPayslipById } from "@/lib/payroll/services/payroll-detail";
import { requireServerAnyPermission } from "@/lib/permissions/server";

type PayslipDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayslipDetailPage({ params }: PayslipDetailPageProps) {
  const profile = await requireServerAnyPermission([
    "payslip.view",
    "payroll.view",
  ]);
  const supabase = await createClient();
  const { id } = await params;
  const [payslip, versions] = await Promise.all([
    getPayslipById(supabase, profile, id),
    listPayslipVersions(supabase, profile, id),
  ]);

  if (!payslip) notFound();

  const canDownload = canDownloadPayroll(profile.permissionCodes);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Payslip {payslip.payslipNumber}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {payslip.employee.firstName} {payslip.employee.lastName} ·{" "}
          {payslip.employee.employeeCode} · Version {payslip.payslipVersion}
        </p>
      </div>
      <PayslipView
        payslip={payslip}
        canDownload={canDownload}
        canEmail={canDownload}
      />
      {canDownload ? <PayslipVersionPanel versions={versions} /> : null}
    </div>
  );
}
