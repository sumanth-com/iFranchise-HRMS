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
  UserRound,
  Users,
} from "lucide-react";

import { CeoProvisioningStatusBadge } from "@/components/ceo/user-provisioning/ceo-provisioning-status-badge";
import { Button } from "@/components/common/button";
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
  isLoading?: boolean;
  busyEmployeeId?: string | null;
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
    canResend(user) || canCancel(user) || canDeactivate(user) || canReactivate(user);

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
  isLoading,
  busyEmployeeId,
  onPageChange,
  onAction,
}: CeoProvisioningPeopleProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Users className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold">Executive Users</h2>
          <p className="text-xs text-muted-foreground">
            Invited and active high-privilege users · click a card to view details.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto size-4 animate-spin" />
        </p>
      ) : users.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No executive users yet. Use “Invite User” to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
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
            Showing {users.length} of {total} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
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
              disabled={page >= totalPages || isLoading}
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
