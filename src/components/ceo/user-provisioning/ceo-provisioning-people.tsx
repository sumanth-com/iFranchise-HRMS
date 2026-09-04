"use client";

import { format } from "date-fns";
import {
  Ban,
  Building2,
  CalendarDays,
  Eye,
  Loader2,
  Mail,
  MoreVertical,
  Pencil,
  Power,
  RotateCw,
  Send,
  Shield,
  ShieldX,
  Trash2,
  Users,
  UserCheck,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { CeoProvisioningStatusBadge } from "@/components/ceo/user-provisioning/ceo-provisioning-status-badge";
import { CeoProvisioningUserSearch } from "@/components/ceo/user-provisioning/ceo-provisioning-user-search";
import { Button } from "@/components/common/button";
import { FilterSelect } from "@/components/common/filter-select";
import { ProvisioningCardAvatar } from "@/components/ceo/user-provisioning/provisioning-card-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { provisioningContactFieldVisibility } from "@/lib/ceo/provisioning-contact-fields";
import type {
  CeoProvisioningUser,
  ProvisioningRowAction,
} from "@/types/ceo-user-provisioning";
import {
  canCancelProvisioningInvitation,
  canChangePendingProvisioningRole,
  canChangeProvisioningReportingContacts,
  canEditPendingProvisioningUser,
  canResendProvisioningInvitation,
  canSendProvisioningInvitation,
} from "@/lib/ceo/provisioning-user-permissions";

type CeoProvisioningPeopleProps = {
  users: CeoProvisioningUser[];
  isRefreshing?: boolean;
  busyEmployeeId?: string | null;
  showFilters?: boolean;
  onAction: (action: ProvisioningRowAction, user: CeoProvisioningUser) => void;
};

function matchesSearch(user: CeoProvisioningUser, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [
    user.fullName,
    user.email,
    user.employeeCode,
    user.departmentName ?? "",
    user.roleLabel,
  ]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function isDeactivatedUser(user: CeoProvisioningUser) {
  return (
    user.invitationStatus === "inactive" ||
    user.invitationStatus === "revoked" ||
    user.invitationStatus === "deactivated" ||
    user.accountStatus === "inactive" ||
    user.accountStatus === "suspended"
  );
}

function matchesStatusFilter(user: CeoProvisioningUser, statusFilter: string) {
  if (statusFilter === "all") return true;
  if (statusFilter === "deactivated") return isDeactivatedUser(user);
  if (statusFilter === "pending") {
    return (
      user.invitationStatus === "pending" ||
      user.invitationStatus === "expired" ||
      user.invitationStatus === "cancelled"
    );
  }
  if (statusFilter === "opened") return user.invitationStatus === "opened";
  if (statusFilter === "active") return user.invitationStatus === "active";
  return user.invitationStatus === statusFilter;
}

function fmtInviteDate(value: string | null) {
  return value ? format(new Date(value), "d MMM yyyy") : null;
}

function canDeactivate(user: CeoProvisioningUser) {
  return user.invitationStatus === "active" && !user.isSelf;
}

function canReactivate(user: CeoProvisioningUser) {
  return user.accountStatus === "suspended" || user.accountStatus === "inactive";
}

function canDelete(user: CeoProvisioningUser) {
  if (user.isSelf) return false;
  return (
    user.accountStatus === "invitation_pending" ||
    user.accountStatus === "draft" ||
    user.accountStatus === "invited" ||
    user.invitationStatus === "cancelled" ||
    user.invitationStatus === "pending" ||
    user.invitationStatus === "opened" ||
    user.invitationStatus === "expired"
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function PersonCard({
  user,
  busy,
  onAction,
}: {
  user: CeoProvisioningUser;
  busy: boolean;
  onAction: (action: ProvisioningRowAction, user: CeoProvisioningUser) => void;
}) {
  const showSend = canSendProvisioningInvitation(user);
  const showResend = canResendProvisioningInvitation(user);
  const showReportingContacts = canChangeProvisioningReportingContacts(user);
  const pendingActions =
    canEditPendingProvisioningUser(user) ||
    canChangePendingProvisioningRole(user) ||
    showReportingContacts ||
    showSend ||
    showResend;
  const hasActions =
    pendingActions ||
    canCancelProvisioningInvitation(user) ||
    canDelete(user) ||
    canDeactivate(user) ||
    canReactivate(user);

  const inviteLabel = user.invitationSentAt
    ? fmtInviteDate(user.invitationSentAt)
    : "Not invited";

  const { showAssignedHr } = provisioningContactFieldVisibility(user);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:bg-muted/80"
                aria-label={`Actions for ${user.fullName}`}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MoreVertical className="size-4" />
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-auto min-w-[12.5rem]">
            <DropdownMenuItem onClick={() => onAction("view", user)}>
              <Eye className="mr-2 size-4" />
              <span className="whitespace-nowrap">View User Details</span>
            </DropdownMenuItem>
            {pendingActions ? <DropdownMenuSeparator /> : null}
            {canEditPendingProvisioningUser(user) ? (
              <DropdownMenuItem onClick={() => onAction("edit", user)}>
                <Pencil className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
            ) : null}
            {canChangePendingProvisioningRole(user) ? (
              <DropdownMenuItem onClick={() => onAction("changeRole", user)}>
                <Shield className="mr-2 size-4" />
                Change role
              </DropdownMenuItem>
            ) : null}
            {showReportingContacts ? (
              <DropdownMenuItem onClick={() => onAction("changeReportingContacts", user)}>
                <UserCheck className="mr-2 size-4" />
                <span className="whitespace-nowrap">Update HR contact</span>
              </DropdownMenuItem>
            ) : null}
            {showSend ? (
              <DropdownMenuItem onClick={() => onAction("resend", user)}>
                <Send className="mr-2 size-4" />
                <span className="whitespace-nowrap">Send Invite</span>
              </DropdownMenuItem>
            ) : null}
            {showResend ? (
              <DropdownMenuItem onClick={() => onAction("resend", user)}>
                <RotateCw className="mr-2 size-4" />
                <span className="whitespace-nowrap">Resend Invite</span>
              </DropdownMenuItem>
            ) : null}
            {hasActions &&
            (canCancelProvisioningInvitation(user) ||
              canDelete(user) ||
              canDeactivate(user) ||
              canReactivate(user)) ? (
              <DropdownMenuSeparator />
            ) : null}
            {canCancelProvisioningInvitation(user) ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onAction("cancel", user)}
              >
                <ShieldX className="mr-2 size-4" />
                Cancel invitation
              </DropdownMenuItem>
            ) : null}
            {canDelete(user) ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onAction("delete", user)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete user
              </DropdownMenuItem>
            ) : null}
            {canDeactivate(user) ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onAction("deactivate", user)}
              >
                <Ban className="mr-2 size-4" />
                <span className="whitespace-nowrap">Deactivate Access</span>
              </DropdownMenuItem>
            ) : null}
            {canReactivate(user) ? (
              <DropdownMenuItem onClick={() => onAction("reactivate", user)}>
                <Power className="mr-2 size-4" />
                Reactivate user
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        type="button"
        onClick={() => onAction("view", user)}
        className="flex items-start gap-3 p-4 pr-10 text-left"
      >
        <ProvisioningCardAvatar user={user} className="size-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground group-hover:text-primary">
            {user.fullName}
            {user.isSelf ? (
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                (You)
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.roleLabel}</p>
          <div className="mt-2">
            <CeoProvisioningStatusBadge status={user.invitationStatus} />
          </div>
        </div>
      </button>

      <div className="space-y-3 border-t border-border/70 px-4 py-3.5">
        <MetaRow icon={<Mail className="size-3.5" />} label="Email" value={user.email} />
        <MetaRow
          icon={<Building2 className="size-3.5" />}
          label="Department"
          value={user.departmentName ?? "—"}
        />
        {showAssignedHr ? (
          <MetaRow
            icon={<UserCheck className="size-3.5" />}
            label="HR Contact"
            value={user.assignedHrEmployeeName ?? "—"}
          />
        ) : null}
        <MetaRow
          icon={<CalendarDays className="size-3.5" />}
          label="Invited"
          value={inviteLabel ?? "Not invited"}
        />
      </div>
    </article>
  );
}

export function CeoProvisioningPeople({
  users,
  isRefreshing,
  busyEmployeeId,
  showFilters = false,
  onAction,
}: CeoProvisioningPeopleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchSearchSuggestions = useCallback(
    async (query: string) =>
      users.filter((user) => matchesSearch(user, query)).slice(0, 8),
    [users],
  );

  const filteredUsers = useMemo(() => {
    if (!showFilters) return users;
    return users.filter(
      (user) =>
        matchesSearch(user, searchQuery) && matchesStatusFilter(user, statusFilter),
    );
  }, [users, showFilters, searchQuery, statusFilter]);

  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Users className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Portal Users</h2>
          <p className="text-xs text-muted-foreground">
            All employees with portal access status and provisioning details.
          </p>
        </div>
        {showFilters ? (
          <>
            <CeoProvisioningUserSearch
              value={searchQuery}
              className="w-full min-w-[12rem] sm:w-[min(100%,16rem)]"
              onChange={(search) => setSearchQuery(search ?? "")}
              onFetchSuggestions={fetchSearchSuggestions}
            />
            <FilterSelect
              className="w-full min-w-[10rem] shrink-0 sm:w-[140px]"
              items={[
                { value: "all", label: "All statuses" },
                { value: "pending", label: "Pending" },
                { value: "opened", label: "Opened" },
                { value: "active", label: "Active" },
                { value: "deactivated", label: "Deactivated" },
              ]}
              value={statusFilter}
              placeholder="All statuses"
              onValueChange={setStatusFilter}
            />
            <span className="inline-flex h-10 shrink-0 items-center rounded-md border border-border bg-white px-3 text-sm font-semibold dark:bg-input">
              {filteredUsers.length} people
            </span>
          </>
        ) : null}
        {isRefreshing ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {filteredUsers.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {showFilters && (searchQuery || statusFilter !== "all")
            ? "No employees match your search or filters."
            : "No employees found. Use “Invite User” to get started."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <PersonCard
              key={user.employeeId}
              user={user}
              busy={busyEmployeeId === user.employeeId}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </section>
  );
}
