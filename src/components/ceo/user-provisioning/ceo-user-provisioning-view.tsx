"use client";

import { UserRoundPlus } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoInviteUserDialog } from "@/components/ceo/user-provisioning/ceo-invite-user-dialog";
import { CeoProvisioningDrawer } from "@/components/ceo/user-provisioning/ceo-provisioning-drawer";
import { CeoProvisioningPeople } from "@/components/ceo/user-provisioning/ceo-provisioning-people";
import { CeoProvisioningSummaryCards } from "@/components/ceo/user-provisioning/ceo-provisioning-summary";
import { Button } from "@/components/common/button";
import {
  cancelProvisioningInvitationAction,
  deactivateProvisioningUserAction,
  fetchCeoProvisioningUsersAction,
  getCeoUserProvisioningModuleData,
  reactivateProvisioningUserAction,
  resendProvisioningInvitationAction,
} from "@/lib/ceo/actions/ceo-user-provisioning-actions";
import type {
  CeoProvisioningListParams,
  CeoProvisioningUser,
  CeoUserProvisioningPageData,
  ProvisioningRowAction,
} from "@/types/ceo-user-provisioning";

type CeoUserProvisioningViewProps = CeoUserProvisioningPageData & {
  initialFilters: CeoProvisioningListParams;
};

const MUTATION_ACTIONS: Record<
  Exclude<ProvisioningRowAction, "view">,
  (employeeId: string) => Promise<{ success: boolean; message: string }>
> = {
  resend: resendProvisioningInvitationAction,
  cancel: cancelProvisioningInvitationAction,
  deactivate: deactivateProvisioningUserAction,
  reactivate: reactivateProvisioningUserAction,
};

const CONFIRM_MESSAGES: Partial<Record<ProvisioningRowAction, string>> = {
  cancel: "Cancel this invitation? The pending account will be removed.",
  deactivate: "Deactivate this user? They will lose portal access until reactivated.",
};

export function CeoUserProvisioningView({
  summary: initialSummary,
  users: initialUsers,
  lookups,
  inviteServiceReady,
  initialFilters,
}: CeoUserProvisioningViewProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [users, setUsers] = useState(initialUsers);
  const [pageParams, setPageParams] = useState<CeoProvisioningListParams>({
    page: initialFilters.page ?? 1,
    pageSize: initialFilters.pageSize ?? 8,
  });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [busyEmployeeId, setBusyEmployeeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshList = useCallback((next: CeoProvisioningListParams) => {
    startTransition(async () => {
      const result = await fetchCeoProvisioningUsersAction(next);
      setUsers(result);
    });
  }, []);

  const refreshAll = useCallback((next: CeoProvisioningListParams) => {
    startTransition(async () => {
      const data = await getCeoUserProvisioningModuleData(next);
      setSummary(data.summary);
      setUsers(data.users);
    });
  }, []);

  function changePage(page: number) {
    const next = { ...pageParams, page };
    setPageParams(next);
    refreshList(next);
  }

  function handleAction(action: ProvisioningRowAction, user: CeoProvisioningUser) {
    if (action === "view") {
      setSelectedEmployeeId(user.employeeId);
      setDrawerOpen(true);
      return;
    }

    const confirmMessage = CONFIRM_MESSAGES[action];
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    const runner = MUTATION_ACTIONS[action];
    setBusyEmployeeId(user.employeeId);
    startTransition(async () => {
      const result = await runner(user.employeeId);
      setBusyEmployeeId(null);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (action === "cancel" || action === "deactivate") {
        setDrawerOpen(false);
      }
      const data = await getCeoUserProvisioningModuleData(pageParams);
      setSummary(data.summary);
      setUsers(data.users);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <CeoBackToDashboard />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <CeoModulePageHeader
          title="User Provisioning"
          description="Invite and manage executive users across the organization."
        />
        <Button
          type="button"
          className="gap-1.5"
          onClick={() => setInviteOpen(true)}
          disabled={!inviteServiceReady}
        >
          <UserRoundPlus className="size-4" />
          Invite User
        </Button>
      </div>

      <CeoProvisioningSummaryCards summary={summary} />

      <CeoProvisioningPeople
        users={users.data}
        total={users.total}
        page={users.page}
        pageSize={users.pageSize}
        isLoading={isPending}
        busyEmployeeId={busyEmployeeId}
        onPageChange={changePage}
        onAction={handleAction}
      />

      <CeoInviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        lookups={lookups}
        inviteServiceReady={inviteServiceReady}
        onInvited={() => refreshAll(pageParams)}
      />

      <CeoProvisioningDrawer
        employeeId={selectedEmployeeId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onAction={(action, detail) => handleAction(action, detail.user)}
      />
    </div>
  );
}
