import { Suspense } from "react";

import { AccountantDashboardView } from "@/components/accountant/accountant-dashboard-view";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { getAccountantDashboardData } from "@/lib/accountant/dashboard-queries";
import { requireAccountantPortal } from "@/lib/accountant/permissions";
import { createClient } from "@/lib/supabase/server";

async function FinanceDashboardContent() {
  const profile = await requireAccountantPortal();
  const supabase = await createClient();
  const data = await getAccountantDashboardData(supabase, profile);

  return (
    <AccountantDashboardView
      greeting={data.greeting}
      summary={data.summary}
      month={data.month}
      year={data.year}
      periodLabel={data.periodLabel}
      nextPeriodLabel={data.nextPeriodLabel}
      currentPayrollStatus={data.currentPayrollStatus}
      currentPayrollStatusLabel={data.currentPayrollStatusLabel}
      lastCompletedPayroll={data.lastCompletedPayroll}
      nextActionLabel={data.nextActionLabel}
      approvedReimbursements={data.approvedReimbursements}
      reimbursementOverview={data.reimbursementOverview}
      recentActivity={data.recentActivity}
    />
  );
}

export default function AccountantFinanceDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <FinanceDashboardContent />
    </Suspense>
  );
}
