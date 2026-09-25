import { Suspense } from "react";

import { TeamLeaveBalancesPanel } from "@/components/leave/team-leave-balances-panel";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { SectionHelpButton } from "@/components/common/section-help-button";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  CEO_APPROVALS_SECTION_HELP,
  CEO_SECTION_HELP_DESCRIPTION,
} from "@/lib/ceo/section-help";
import { listTeamLeaveBalancesAction } from "@/lib/leave/actions";
import { requireServerAnyPermission } from "@/lib/permissions/server";

async function CeoLeaveBalanceContent() {
  await requireServerAnyPermission([
    PORTAL_PERMISSIONS.ceo,
    "leave.approve",
    "leave_balance.view",
  ]);

  // Prefetch current month so the grid paints with data (no client loading flash).
  const initial = await listTeamLeaveBalancesAction({});
  const initialData = initial.success ? initial.data : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div>
        <SectionHelpButton
          title={CEO_APPROVALS_SECTION_HELP.leaveBalance.title}
          points={[...CEO_APPROVALS_SECTION_HELP.leaveBalance.points]}
          description={CEO_SECTION_HELP_DESCRIPTION}
        >
          <h1 className="text-2xl font-semibold tracking-tight">Leave Balance</h1>
        </SectionHelpButton>
        <p className="mt-1 text-sm text-muted-foreground">
          Current leave balances for active employees — same ledger as each employee&apos;s
          My Leave view.
        </p>
      </div>
      <TeamLeaveBalancesPanel initialData={initialData} />
    </div>
  );
}

export default function CeoApprovalsLeaveBalancePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CeoLeaveBalanceContent />
    </Suspense>
  );
}
