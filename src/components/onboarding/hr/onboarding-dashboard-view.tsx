"use client";

import Link from "next/link";
import { ClipboardList, Loader2, Mail, Search, Trash2, UserPlus } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
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
import type { OnboardingModuleData } from "@/lib/onboarding/loaders/hr-onboarding-loaders";
import { assignOnboardingRouteRefs } from "@/lib/onboarding/routing";
import { HIRING_SECTION_HELP } from "@/lib/recruitment/section-help";
import {
  ONBOARDING_ROUTES,
  ONBOARDING_STATUS_LABELS,
  ONBOARDING_STATUSES,
  type OnboardingCaseListItem,
} from "@/types/onboarding";
import type { OnboardingListParams } from "@/types/onboarding";

type OnboardingDashboardViewProps = OnboardingModuleData & {
  initialFilters: OnboardingListParams;
  readOnly?: boolean;
  basePath?: string;
};

function statusBadgeClass(status: string) {
  if (status === "pending_hr_review") return "bg-amber-100 text-amber-800";
  if (status === "employee_created" || status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "rejected" || status === "cancelled") return "bg-red-100 text-red-800";
  if (status === "corrections_requested") return "bg-orange-100 text-orange-800";
  if (status === "draft") return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-slate-700";
}

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

function inviteActionLabel(row: OnboardingCaseListItem) {
  return row.invitationSentAt || row.status !== "draft" ? "Resend invitation" : "Send invitation";
}

export function OnboardingDashboardView({
  cases: initialCases,
  lookups: _lookups,
  initialFilters,
  readOnly = false,
  basePath = ONBOARDING_ROUTES.hrList,
}: OnboardingDashboardViewProps) {
  const [cases, setCases] = useState(initialCases);
  const [filters, setFilters] = useState(initialFilters);
  const [deleteTarget, setDeleteTarget] = useState<OnboardingCaseListItem | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<OnboardingCaseListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback((next: OnboardingListParams) => {
    startTransition(async () => {
      const data = await fetchOnboardingModuleAction(next);
      setCases(data.cases);
    });
  }, []);

  function applyFilter(patch: Partial<OnboardingListParams>) {
    const next = { ...filters, ...patch, page: patch.page ?? 1 };
    setFilters(next);
    refresh(next);
  }

  const inviteableCases = cases.data.filter((row) => canSendOnboardingInvite(row.status));

  function openInviteDialog(row?: OnboardingCaseListItem) {
    setInviteTarget(row ?? inviteableCases[0] ?? null);
    setInviteOpen(true);
  }

  function closeInviteDialog() {
    setInviteOpen(false);
    setInviteTarget(null);
  }

  function confirmInvite() {
    if (!inviteTarget) return;

    startTransition(async () => {
      const result = await sendOnboardingInvitationAction(inviteTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      closeInviteDialog();
      refresh(filters);
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteOnboardingAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setDeleteTarget(null);
      refresh(filters);
    });
  }

  const routeRefs = assignOnboardingRouteRefs(
    cases.data.map((row) => ({ id: row.id, fullName: row.fullName })),
  );

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

      <div className="flex w-full items-center gap-3">
        <div className="relative w-72 max-w-full shrink-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search name or email"
            value={filters.search ?? ""}
            onChange={(e) => applyFilter({ search: e.target.value || undefined })}
            className="h-9 w-full bg-background pl-9"
          />
        </div>
        <div className="w-52 shrink-0 sm:w-56">
          <FilterSelect
            value={filters.status ?? "all"}
            onValueChange={(v) => applyFilter({ status: v === "all" ? undefined : v })}
            items={[
              { value: "all", label: "All statuses" },
              ...ONBOARDING_STATUSES.map((s) => ({
                value: s,
                label: ONBOARDING_STATUS_LABELS[s],
              })),
            ]}
          />
        </div>
        {readOnly ? null : (
          <Button
            type="button"
            className="h-9 shrink-0 sm:ml-auto"
            disabled={isPending}
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
                <th className="p-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {cases.data.map((row) => (
                <tr key={row.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{row.fullName}</div>
                    <div className="text-muted-foreground text-xs">{row.personalEmail}</div>
                  </td>
                  <td className="p-3">{row.designationName ?? row.intendedRoleName ?? "—"}</td>
                  <td className="p-3">{row.joiningDate ?? "—"}</td>
                  <td className="p-3">{row.completionPercent}%</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}>
                      {ONBOARDING_STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`${basePath}/${routeRefs.get(row.id) ?? row.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-primary hover:bg-muted hover:text-primary"
                      >
                        <ClipboardList className="h-4 w-4" />
                        {readOnly ? "View" : "Review"}
                      </Link>
                      {!readOnly && canSendOnboardingInvite(row.status) ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          disabled={isPending}
                          onClick={() => openInviteDialog(row)}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {inviteActionLabel(row)}
                        </Button>
                      ) : null}
                      {!readOnly && canDeleteOnboardingCase(row.status) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${row.fullName}`}
                          disabled={isPending}
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cases.total > filters.pageSize && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page <= 1 || isPending}
            onClick={() => applyFilter({ page: filters.page - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            Page {filters.page} · {cases.total} total
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page * filters.pageSize >= cases.total || isPending}
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
              disabled={isPending}
              onClick={closeInviteDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending || !inviteTarget || inviteableCases.length === 0}
              onClick={confirmInvite}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {inviteTarget ? inviteActionLabel(inviteTarget) : "Send invitation"}
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
              disabled={isPending}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || !deleteTarget}
              onClick={confirmDelete}
            >
              {isPending ? (
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
