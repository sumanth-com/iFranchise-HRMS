"use client";

import { format } from "date-fns";
import {
  Ban,
  Building2,
  Eye,
  Loader2,
  Mail,
  MoreVertical,
  Power,
  RotateCw,
  ShieldX,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { CeoProvisioningStatusBadge } from "@/components/ceo/user-provisioning/ceo-provisioning-status-badge";
import { Button } from "@/components/common/button";
import { FilterSelect } from "@/components/common/filter-select";
import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  CeoProvisioningUser,
  ProvisioningRowAction,
} from "@/types/ceo-user-provisioning";

type CeoProvisioningPeopleProps = {
  users: CeoProvisioningUser[];
  total: number;
  page: number;
  pageSize: number;
  isRefreshing?: boolean;
  busyEmployeeId?: string | null;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  onPageChange: (page: number) => void;
  onAction: (action: ProvisioningRowAction, user: CeoProvisioningUser) => void;
};

function fmtDate(value: string | null) {
  return value ? format(new Date(value), "d MMM yyyy") : "—";
}

function canResend(user: CeoProvisioningUser) {
  return user.accountStatus === "invitation_pending";
}
function canCancel(user: CeoProvisioningUser) {
  return user.accountStatus === "invitation_pending";
}
function canDeactivate(user: CeoProvisioningUser) {
  return user.accountStatus === "active" && !user.isSelf;
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
    user.invitationStatus === "expired"
  );
}

function MetaRow({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 truncate">{value}</span>
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
  const hasActions =
    canResend(user) ||
    canCancel(user) ||
    canDelete(user) ||
    canDeactivate(user) ||
    canReactivate(user);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
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
          <DropdownMenuContent align="end" className="min-w-[12rem]">
            <DropdownMenuItem onClick={() => onAction("view", user)}>
              <Eye className="mr-2 size-4" />
              View details
            </DropdownMenuItem>
            {hasActions ? <DropdownMenuSeparator /> : null}
            {canResend(user) ? (
              <DropdownMenuItem onClick={() => onAction("resend", user)}>
                <RotateCw className="mr-2 size-4" />
                Resend invitation
              </DropdownMenuItem>
            ) : null}
            {canCancel(user) ? (
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
                Deactivate user
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
        <EmployeeAvatar
          firstName={user.firstName}
          lastName={user.lastName}
          profileImagePath={null}
          className="size-12 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold group-hover:text-primary">
            {user.fullName}
            {user.isSelf ? (
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                (You)
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.roleLabel}</p>
          <div className="mt-1.5">
            <CeoProvisioningStatusBadge status={user.invitationStatus} />
          </div>
        </div>
      </button>

      <div className="space-y-1.5 border-t px-4 py-3 text-xs">
        <MetaRow icon={<Mail className="size-3.5" />} value={user.email} />
        <MetaRow
          icon={<Building2 className="size-3.5" />}
          value={user.departmentName ?? "—"}
        />
        <MetaRow
          icon={<UserRound className="size-3.5" />}
          value={
            user.reportingManagerName
              ? `Reports to ${user.reportingManagerName}`
              : "No reporting manager"
          }
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
        <span className="truncate">Invited {fmtDate(user.invitationSentAt)}</span>
        <span className="truncate">
          {user.invitationStatus === "accepted"
            ? `Accepted ${fmtDate(user.acceptedAt)}`
            : user.sentByName
              ? `by ${user.sentByName}`
              : ""}
        </span>
      </div>
    </article>
  );
}

export function CeoProvisioningPeople({
  users,
  total,
  page,
  pageSize,
  isRefreshing,
  busyEmployeeId,
  statusFilter: controlledStatusFilter,
  onStatusFilterChange,
  onPageChange,
  onAction,
}: CeoProvisioningPeopleProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [internalStatusFilter, setInternalStatusFilter] = useState("all");
  const statusFilter = controlledStatusFilter ?? internalStatusFilter;

  const handleFilterChange = (nextStatus: string) => {
    if (onStatusFilterChange) {
      onStatusFilterChange(nextStatus);
    } else {
      setInternalStatusFilter(nextStatus);
    }
  };

  const isDeactivated = (u: CeoProvisioningUser) =>
    u.invitationStatus === "inactive" ||
    u.invitationStatus === "revoked" ||
    (u.invitationStatus as string) === "deactivated" ||
    u.accountStatus === "inactive" ||
    u.accountStatus === "suspended";

  const isPending = (u: CeoProvisioningUser) =>
    u.invitationStatus === "pending" ||
    u.invitationStatus === "expired" ||
    u.invitationStatus === "cancelled" ||
    u.accountStatus === "invitation_pending" ||
    u.accountStatus === "draft" ||
    u.accountStatus === "invited";

  const isAccepted = (u: CeoProvisioningUser) =>
    u.invitationStatus === "accepted" || u.accountStatus === "active";

  const filteredUsers = useMemo(() => {
    if (onStatusFilterChange) return users;
    if (statusFilter === "all") return users;
    if (statusFilter === "deactivated") return users.filter(isDeactivated);
    if (statusFilter === "pending") return users.filter(isPending);
    if (statusFilter === "accepted") return users.filter(isAccepted);
    return users.filter((u) => u.invitationStatus === statusFilter);
  }, [users, statusFilter, onStatusFilterChange]);

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Users className="size-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Portal Users</h2>
          <p className="text-xs text-muted-foreground">
            Invited and active portal users, including pending invitations.
          </p>
        </div>
        <FilterSelect
          className="w-[140px] shrink-0"
          items={[
            { value: "all", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "accepted", label: "Accepted" },
            { value: "deactivated", label: "Deactivated" },
          ]}
          value={statusFilter}
          placeholder="All statuses"
          onValueChange={handleFilterChange}
        />
        {isRefreshing && users.length > 0 ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {filteredUsers.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {statusFilter === "deactivated"
            ? "No deactivated users found."
            : statusFilter === "pending"
              ? "No pending invitations found."
              : statusFilter === "accepted"
                ? "No active users found."
                : "No users found. Use “Invite User” to get started."}
        </p>
      ) : (
        <div
          className={
            isRefreshing
              ? "grid gap-4 opacity-80 transition-opacity grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              : "grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }
        >
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

      {total > pageSize ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Showing {filteredUsers.length} of {total} user{total === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isRefreshing}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isRefreshing}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
