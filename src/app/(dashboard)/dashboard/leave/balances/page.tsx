import { LeaveBalanceTable } from "@/components/leave/leave-balance-table";
import { createClient } from "@/lib/supabase/server";
import { listLeaveBalances } from "@/lib/leave/services/leave-queries";
import { getCurrentBalanceYear } from "@/lib/leave/services/leave-utils";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function LeaveBalancesPage() {
  const profile = await requireServerPermission("leave_balance.view");
  const supabase = await createClient();
  const balanceYear = getCurrentBalanceYear();
  const balances = await listLeaveBalances(supabase, profile, balanceYear);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leave Balances</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View allocated, used, pending, and available leave balances for {balanceYear}.
        </p>
      </div>
      <LeaveBalanceTable balances={balances} />
    </div>
  );
}
