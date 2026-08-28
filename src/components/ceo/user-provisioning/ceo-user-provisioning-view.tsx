"use client";

import { UserRoundPlus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoInviteUserDialog } from "@/components/ceo/user-provisioning/ceo-invite-user-dialog";
import {
  CeoProvisioningConfirmDialog,
  type ProvisioningConfirmAction,
} from "@/components/ceo/user-provisioning/ceo-provisioning-confirm-dialog";
import { CeoProvisioningDrawer } from "@/components/ceo/user-provisioning/ceo-provisioning-drawer";
import { CeoProvisioningFilters } from "@/components/ceo/user-provisioning/ceo-provisioning-filters";
import { CeoProvisioningPeople } from "@/components/ceo/user-provisioning/ceo-provisioning-people";
import { CeoProvisioningSummaryCards } from "@/components/ceo/user-provisioning/ceo-provisioning-summary";
import { Button } from "@/components/common/button";
import {
  cancelProvisioningInvitationAction,
  deactivateProvisioningUserAction,
  deleteProvisioningUserAction,
  fetchCeoProvisioningUsersAction,
  getCeoUserProvisioningModuleData,
  reactivateProvisioningUserAction,
  resendProvisioningInvitationAction,
} from "@/lib/ceo/actions/ceo-user-provisioning-actions";
import type {
  CeoProvisioningListParams,
  CeoProvisioningUser,
  CeoUserProvisioningPageData,
  ProvisioningInvitationStatus,
  ProvisioningRowAction,
} from "@/types/ceo-user-provisioning";

type CeoUserProvisioningViewProps = CeoUserProvisioningPageData & {
  initialFilters: CeoProvisioningListParams;
  variant?: "ceo" | "hr";
};

const MUTATION_ACTIONS: Record<
  Exclude<ProvisioningRowAction, "view">,
  (employeeId: string) => Promise<{ success: boolean; message: string }>
> = {
  resend: resendProvisioningInvitationAction,
  cancel: cancelProvisioningInvitationAction,
  delete: deleteProvisioningUserAction,
  deactivate: deactivateProvisioningUserAction,
  reactivate: reactivateProvisioningUserAction,
};

export function CeoUserProvisioningView({
  summary: initialSummary,
  users: initialUsers,
  lookups: initialLookups,
  inviteServiceReady,
  eligibleOnboardingCandidates: initialEligibleCandidates,
  initialFilters,
  variant = "ceo",
}: CeoUserProvisioningViewProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [users, setUsers] = useState(initialUsers);
  const [lookups, setLookups] = useState(initialLookups);
  const [eligibleOnboardingCandidates, setEligibleOnboardingCandidates] = useState(
    initialEligibleCandidates,
  );
  const [pageParams, setPageParams] = useState<CeoProvisioningListParams>({
    page: initialFilters.page ?? 1,
    pageSize: initialFilters.pageSize ?? 9,
    search: initialFilters.search,
    roleCode: initialFilters.roleCode,
    departmentId: initialFilters.departmentId,
    branchId: initialFilters.branchId,
    portalKey: initialFilters.portalKey,
    employmentTypeId: initialFilters.employmentTypeId,
    invitationStatus: initialFilters.invitationStatus,
  });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [busyEmployeeId, setBusyEmployeeId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    action: ProvisioningConfirmAction;
    user: CeoProvisioningUser;
  } | null>(null);
  const [isConfirmPending, setIsConfirmPending] = useState(false);

  const refreshModuleData = useCallback(
    async (next: CeoProvisioningListParams, options?: { showRefreshing?: boolean }) => {
      if (options?.showRefreshing) setIsRefreshing(true);
      try {
        const data = await getCeoUserProvisioningModuleData(next);
        setSummary(data.summary);
        setUsers(data.users);
        setLookups(data.lookups);
        setEligibleOnboardingCandidates(data.eligibleOnboardingCandidates);
      } finally {
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    [],
  );

  const refreshList = useCallback(
    async (next: CeoProvisioningListParams, options?: { showRefreshing?: boolean }) => {
      if (options?.showRefreshing) setIsRefreshing(true);
      try {
        const result = await fetchCeoProvisioningUsersAction(next);
        setUsers(result);
      } finally {
        if (options?.showRefreshing) setIsRefreshing(false);
      }
    },
    [],
  );

  const fetchSearchSuggestions = useCallback(
    async (query: string) => {
      const result = await fetchCeoProvisioningUsersAction({
        ...pageParams,
        search: query,
        page: 1,
        pageSize: 8,
      });
      return result.data;
    },
    [pageParams],
  );

  function applyFilters(next: CeoProvisioningListParams) {
    setPageParams(next);
    void refreshList(next, { showRefreshing: true });
  }

  function changePage(page: number) {
    const next = { ...pageParams, page };
    setPageParams(next);
    void refreshList(next, { showRefreshing: true });
  }

  function requestAction(action: ProvisioningRowAction, user: CeoProvisioningUser) {
    if (action === "view") {
      setSelectedEmployeeId(user.employeeId);
      setDrawerOpen(true);
      return;
    }

    if (action === "resend" || action === "reactivate") {
      void runAction(action, user);
      return;
    }

    if (action === "cancel" || action === "delete" || action === "deactivate") {
      setConfirmAction({ action, user });
    }
  }

  async function runAction(
    action: Exclude<ProvisioningRowAction, "view">,
    user: CeoProvisioningUser,
  ) {
    const runner = MUTATION_ACTIONS[action];
    setBusyEmployeeId(user.employeeId);
    try {
      const result = await runner(user.employeeId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      if (action !== "resend") {
        toast.success(result.message);
      }

      if (action === "cancel" || action === "delete" || action === "deactivate") {
        setDrawerOpen(false);
      }

      await refreshModuleData(pageParams);
    } finally {
      setBusyEmployeeId(null);
    }
  }

  async function confirmPendingAction() {
    if (!confirmAction) return;
    const { action, user } = confirmAction;
    setIsConfirmPending(true);
    try {
      await runAction(action, user);
      setConfirmAction(null);
    } finally {
      setIsConfirmPending(false);
    }
  }

  const headerDescription =
    variant === "hr"
      ? "Invite and manage portal users, executives, and managers across the organization."
      : "Invite and manage executive users across the organization.";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      {variant === "ceo" ? <CeoBackToDashboard /> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        {variant === "hr" ? (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">User Provisioning</h1>
            <p className="mt-1 text-sm text-muted-foreground">{headerDescription}</p>
          </div>
        ) : (
          <CeoModulePageHeader
            title="User Provisioning"
            description={headerDescription}
          />
        )}
        <Button
          type="button"
          className="gap-1.5"
          onClick={() => {
            setInviteOpen(true);
            void refreshModuleData(pageParams);
          }}
          disabled={!inviteServiceReady}
        >
          <UserRoundPlus className="size-4" />
          Invite User
        </Button>
      </div>

      <CeoProvisioningSummaryCards summary={summary} />

      {variant !== "hr" ? (
        <CeoProvisioningFilters
          filters={pageParams}
          lookups={lookups}
          disabled={isRefreshing}
          onChange={applyFilters}
        />
      ) : null}

      <CeoProvisioningPeople
        users={users?.data ?? []}
        total={users?.total ?? 0}
        page={users?.page ?? 1}
        pageSize={users?.pageSize ?? pageParams.pageSize ?? 9}
        isRefreshing={isRefreshing}
        busyEmployeeId={busyEmployeeId}
        statusFilter={pageParams.invitationStatus ?? "all"}
        onStatusFilterChange={(status) => {
          const next = {
            ...pageParams,
            page: 1,
            invitationStatus:
              status === "all"
                ? undefined
                : (status as ProvisioningInvitationStatus),
          };
          applyFilters(next);
        }}
        searchQuery={variant === "hr" ? pageParams.search ?? "" : undefined}
        onSearchChange={
          variant === "hr"
            ? (search) => {
                applyFilters({ ...pageParams, page: 1, search });
              }
            : undefined
        }
        onFetchSearchSuggestions={variant === "hr" ? fetchSearchSuggestions : undefined}
        onPageChange={changePage}
        onAction={requestAction}
      />

      <CeoInviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        lookups={lookups}
        eligibleCandidates={eligibleOnboardingCandidates}
        inviteServiceReady={inviteServiceReady}
        onInvited={() => void refreshModuleData(pageParams)}
      />

      <CeoProvisioningConfirmDialog
        action={confirmAction?.action ?? null}
        userName={confirmAction?.user.fullName ?? null}
        userEmail={confirmAction?.user.email ?? null}
        isPending={isConfirmPending}
        onOpenChange={(open) => {
          if (!open && !isConfirmPending) setConfirmAction(null);
        }}
        onConfirm={() => void confirmPendingAction()}
      />

      <CeoProvisioningDrawer
        employeeId={selectedEmployeeId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onAction={(action, detail) => requestAction(action, detail.user)}
      />
    </div>
  );
}
