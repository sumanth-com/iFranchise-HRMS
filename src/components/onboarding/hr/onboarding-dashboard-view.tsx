"use client";

import Link from "next/link";
import { Eye, Loader2, Mail, RefreshCw, Search, Send, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { FilterSelect } from "@/components/common/filter-select";
import { SectionHelpButton } from "@/components/common/section-help-button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteOnboardingAction,
  fetchOnboardingModuleAction,
  sendOnboardingInvitationAction,
} from "@/lib/onboarding/actions/hr-onboarding-actions";
import {
  buildJoiningMonthOptions,
  buildJoiningYearOptions,
  getHrOnboardingListStatus,
  ONBOARDING_HR_STATUS_FILTER_OPTIONS,
} from "@/lib/onboarding/hr-onboarding-list-utils";
import type { OnboardingModuleData } from "@/lib/onboarding/loaders/hr-onboarding-loaders";
import { assignOnboardingRouteRefs } from "@/lib/onboarding/routing";
import { debounce } from "@/lib/performance/debounce";
import { HIRING_SECTION_HELP } from "@/lib/recruitment/section-help";
import { ONBOARDING_ROUTES, type OnboardingCaseListItem } from "@/types/onboarding";
import type { OnboardingListParams } from "@/types/onboarding";

type OnboardingDashboardViewProps = OnboardingModuleData & {
  initialFilters: OnboardingListParams;
  readOnly?: boolean;
  basePath?: string;
};

const LIST_REFRESH_MS = 15_000;

function canDeleteOnboardingCase(status: string) {
  return status !== "employee_created" && status !== "completed";
}

function canSendOnboardingInvite(status: string) {
  return [
    "draft",
    "invitation_sent",
    "invitation_viewed",
    "in_progress",
    "documents_uploaded",
    "corrections_requested",
    "cancelled",
  ].includes(status);
}

function isResendInvite(row: OnboardingCaseListItem) {
  return Boolean(row.invitationSentAt) || row.status !== "draft";
}

function formatJoiningDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ProgressCell({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="flex min-w-[7rem] items-center gap-2">
      <div className="h-1.5 min-w-[4.5rem] flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">{clamped}%</span>
    </div>
  );
}

export function OnboardingDashboardView({
  cases: initialCases,
  designationFilters,
  initialFilters,
  readOnly = false,
  basePath = ONBOARDING_ROUTES.hrList,
}: OnboardingDashboardViewProps) {
  const [cases, setCases] = useState(initialCases);
  const [filters, setFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.search ?? "");
  const filtersRef = useRef(filters);
  const [deleteTarget, setDeleteTarget] = useState<OnboardingCaseListItem | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<OnboardingCaseListItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [invitingCaseId, setInvitingCaseId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const refresh = useCallback((next: OnboardingListParams, options?: { silent?: boolean }) => {
    if (!options?.silent) setRefreshing(true);
    void fetchOnboardingModuleAction(next)
      .then((data) => {
        setCases(data.cases);
      })
      .catch((error) => {
        if (!options?.silent) {
          toast.error(error instanceof Error ? error.message : "Could not refresh onboarding list");
        }
      })
      .finally(() => {
        if (!options?.silent) setRefreshing(false);
      });
  }, []);

  const applyFilter = useCallback(
    (patch: Partial<OnboardingListParams>) => {
      const next = { ...filtersRef.current, ...patch, page: patch.page ?? 1 };
      setFilters(next);
      filtersRef.current = next;
      refresh(next);
    },
    [refresh],
  );

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        applyFilter({ search: value.trim() || undefined });
      }, 280),
    [applyFilter],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refresh(filtersRef.current, { silent: true });
    }, LIST_REFRESH_MS);

    const onFocus = () => refresh(filtersRef.current, { silent: true });
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const inviteableCases = cases.data.filter((row) => canSendOnboardingInvite(row.status));
  const monthOptions = useMemo(() => buildJoiningMonthOptions(), []);
  const yearOptions = useMemo(() => buildJoiningYearOptions(), []);

  function openInviteDialog(row?: OnboardingCaseListItem) {
    setInviteTarget(row ?? inviteableCases[0] ?? null);
    setInviteOpen(true);
  }

  function closeInviteDialog() {
    setInviteOpen(false);
    setInviteTarget(null);
  }

  async function sendInvite(row: OnboardingCaseListItem) {
    setInvitingCaseId(row.id);
    try {
      const result = await sendOnboardingInvitationAction(row.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      closeInviteDialog();
      refresh(filtersRef.current);
    } finally {
      setInvitingCaseId(null);
    }
  }

  function handleInviteClick(row: OnboardingCaseListItem) {
    if (isResendInvite(row)) {
      void sendInvite(row);
      return;
    }
    openInviteDialog(row);
  }

  function confirmInvite() {
    if (!inviteTarget) return;
    void sendInvite(inviteTarget);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const result = await deleteOnboardingAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setCases((prev) => ({
        ...prev,
        data: prev.data.filter((c) => c.id !== deleteTarget.id),
        total: prev.total - 1,
      }));
      setDeleteTarget(null);
      refresh(filtersRef.current);
    } finally {
      setDeleting(false);
    }
  }

  const routeRefs = assignOnboardingRouteRefs(
    cases.data.map((row) => ({ id: row.id, fullName: row.fullName })),
  );

  const roleFilterItems = [
    { value: "all", label: "All roles" },
    ...designationFilters.map((role) => ({
      value: role.id,
      label: role.title,
    })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <SectionHelpButton
          title={HIRING_SECTION_HELP.onboarding.title}
          points={[...HIRING_SECTION_HELP.onboarding.points]}
        >
          <h1 className="text-2xl font-semibold tracking-tight">Employee Onboarding</h1>
        </SectionHelpButton>
        <p className="mt-1 text-sm text-muted-foreground">
          Candidates with a sent offer appear here. Send or resend their onboarding invitation from
          the list.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative z-10 flex min-w-0 flex-1 flex-nowrap items-center gap-3 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:thin]">
          <div className="relative w-56 shrink-0 sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search name or email"
              value={searchInput}
              onChange={(e) => {
                const value = e.target.value;
                setSearchInput(value);
                debouncedSearch(value);
              }}
              className="h-9 w-full bg-background pl-9"
            />
          </div>

          <div className="w-36 shrink-0 sm:w-40">
            <FilterSelect
              value={filters.designationId ?? "all"}
              onValueChange={(v) =>
                applyFilter({ designationId: v === "all" ? undefined : v })
              }
              items={roleFilterItems}
              triggerClassName="w-full"
              contentClassName="min-w-[12rem]"
            />
          </div>

          <div className="w-32 shrink-0">
            <FilterSelect
              value={filters.joiningMonth ? String(filters.joiningMonth) : "all"}
              onValueChange={(v) =>
                applyFilter({ joiningMonth: v === "all" ? undefined : Number(v) })
              }
              items={monthOptions}
              triggerClassName="w-full"
            />
          </div>

          <div className="w-28 shrink-0">
            <FilterSelect
              value={filters.joiningYear ? String(filters.joiningYear) : "all"}
              onValueChange={(v) =>
                applyFilter({ joiningYear: v === "all" ? undefined : Number(v) })
              }
              items={yearOptions}
              triggerClassName="w-full"
            />
          </div>

          <div className="w-36 shrink-0 sm:w-40">
            <FilterSelect
              value={filters.status ?? "all"}
              onValueChange={(v) => applyFilter({ status: v === "all" ? undefined : v })}
              items={[...ONBOARDING_HR_STATUS_FILTER_OPTIONS]}
              triggerClassName="w-full"
              contentClassName="min-w-[12rem]"
            />
          </div>
        </div>

        {readOnly ? null : (
          <Button
            type="button"
            className="h-9 shrink-0 whitespace-nowrap"
            disabled={invitingCaseId !== null}
            onClick={() => openInviteDialog()}
          >
            <Mail className="h-4 w-4" />
            Send onboarding link
          </Button>
        )}
      </div>

      {cases.data.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-5 w-5" />}
          title="No one ready for onboarding"
          description={
            readOnly
              ? "No pre-joining onboarding cases to display."
              : "People appear here after their offer letter is sent. You can then send the onboarding invitation."
          }
        />
      ) : (
        <div className="w-full overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Candidate</th>
                <th className="p-3 font-medium">Role</th>
                <th className="p-3 font-medium">Joining</th>
                <th className="p-3 font-medium">Progress</th>
                <th className="p-3 font-medium">Status</th>
                <th className="w-[120px] p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.data
                .filter((row) => !["cancelled", "archived"].includes(row.status))
                .map((row) => {
                  const displayStatus = getHrOnboardingListStatus(row);
                  const resend = isResendInvite(row);

                  return (
                    <tr key={row.id} className="border-t hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{row.fullName}</div>
                        <div className="text-xs text-muted-foreground">{row.personalEmail}</div>
                      </td>
                      <td className="p-3">{row.designationName ?? row.intendedRoleName ?? "—"}</td>
                      <td className="p-3">{formatJoiningDate(row.joiningDate)}</td>
                      <td className="p-3">
                        <ProgressCell percent={row.completionPercent} />
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${displayStatus.badgeClass}`}
                        >
                          {displayStatus.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <Link
                            href={`${basePath}/${routeRefs.get(row.id) ?? row.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-muted hover:text-primary"
                            aria-label={readOnly ? `View ${row.fullName}` : `Review ${row.fullName}`}
                            title={readOnly ? "View" : "Review"}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {!readOnly && canSendOnboardingInvite(row.status) ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="h-8 w-8"
                              disabled={invitingCaseId === row.id}
                              aria-label={
                                resend
                                  ? `Resend invitation to ${row.fullName}`
                                  : `Send invitation to ${row.fullName}`
                              }
                              title={resend ? "Resend invitation" : "Send invitation"}
                              onClick={() => handleInviteClick(row)}
                            >
                              {invitingCaseId === row.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : resend ? (
                                <RefreshCw className="h-4 w-4" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          ) : null}
                          {!readOnly && canDeleteOnboardingCase(row.status) ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="h-8 w-8"
                              aria-label={`Delete ${row.fullName}`}
                              disabled={deleting}
                              onClick={() => setDeleteTarget(row)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {cases.total > filters.pageSize && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page <= 1 || refreshing}
            onClick={() => applyFilter({ page: filters.page - 1 })}
          >
            Previous
          </Button>
          <span className="self-center text-sm text-muted-foreground">
            Page {filters.page} · {cases.total} total
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page * filters.pageSize >= cases.total || refreshing}
            onClick={() => applyFilter({ page: filters.page + 1 })}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          if (open) setInviteOpen(true);
          else closeInviteDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send onboarding link</DialogTitle>
            <DialogDescription>
              {inviteableCases.length === 0
                ? "People appear here after an offer is sent. Send an offer first, then come back to email their onboarding link."
                : "Choose the person and email them a secure onboarding link. You can resend if they already received one."}
            </DialogDescription>
          </DialogHeader>
          {inviteableCases.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="onboarding-invite-person">Person</Label>
              <FilterSelect
                value={inviteTarget?.id ?? ""}
                onValueChange={(id) =>
                  setInviteTarget(inviteableCases.find((row) => row.id === id) ?? null)
                }
                placeholder="Select a person"
                items={inviteableCases.map((row) => ({
                  value: row.id,
                  label: `${row.fullName} · ${row.personalEmail}`,
                }))}
              />
              {inviteTarget ? (
                <p className="text-xs text-muted-foreground">
                  Link will be sent to {inviteTarget.personalEmail}.
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={invitingCaseId !== null}
              onClick={closeInviteDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                invitingCaseId !== null || !inviteTarget || inviteableCases.length === 0
              }
              onClick={confirmInvite}
            >
              {invitingCaseId !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  {inviteTarget && isResendInvite(inviteTarget) ? (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {inviteTarget
                    ? isResendInvite(inviteTarget)
                      ? "Resend invitation"
                      : "Send invitation"
                    : "Send invitation"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete onboarding case?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `This will permanently remove ${deleteTarget.fullName} (${deleteTarget.personalEmail}) from onboarding. Portal access and invitation links will stop working. This cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || !deleteTarget}
              onClick={() => void confirmDelete()}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
