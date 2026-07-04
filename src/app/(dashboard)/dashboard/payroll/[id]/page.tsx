import { notFound } from "next/navigation";

import { PayrollDetailView } from "@/components/payroll/payroll-detail-view";
import { createClient } from "@/lib/supabase/server";
import {
  canApprovePayroll,
  canRunPayroll,
} from "@/lib/payroll/constants";
import { getPayrollRunById } from "@/lib/payroll/services/payroll-detail";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";

type PayrollDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayrollDetailPage({ params }: PayrollDetailPageProps) {
  const profile = await requireServerPermission("payroll.view");
  const supabase = await createClient();
  const { id } = await params;
  const payroll = await getPayrollRunById(supabase, profile, id);

  if (!payroll) notFound();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll run details</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review payroll items, approvals, and processing status.
        </p>
      </div>
      <PayrollDetailView
        payroll={payroll}
        canRun={canRunPayroll(profile.permissionCodes)}
        canApprove={canApprovePayroll(profile.permissionCodes)}
        canPay={hasPermission(profile.permissionCodes, "payroll.pay")}
      />
    </>
  );
}
