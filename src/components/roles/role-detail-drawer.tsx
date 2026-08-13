"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import { RoleStatusBadge } from "@/components/roles/role-status-badge";
import { fetchRoleAccessDetailAction } from "@/lib/roles/actions";
import type { RoleAccessDetail } from "@/types/roles";

type Props = {
  roleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

export function RoleDetailDrawer({ roleId, open, onOpenChange }: Props) {
  const [detail, setDetail] = useState<RoleAccessDetail | null>(null);
  const [isLoading, startLoading] = useTransition();

  useEffect(() => {
    if (!open || !roleId) return;
    setDetail(null);
    startLoading(async () => {
      const res = await fetchRoleAccessDetailAction(roleId);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setDetail(res.data);
    });
  }, [open, roleId]);

  const role = detail?.role;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={role?.name ?? "Role details"}
      description="Read-only access preview. This does not impersonate a user."
      contentClassName="sm:max-w-2xl"
      showCancel={false}
      footer={
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      {isLoading || !detail || !role ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading role…
        </div>
      ) : (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4">
            <DetailField label="Code" value={role.code} />
            <DetailField label="Type" value={role.isSystemRole ? "System" : "Custom"} />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-0.5">
                <RoleStatusBadge status={role.status} />
              </div>
            </div>
            <DetailField label="Users" value={String(role.userCount)} />
            <DetailField label="Permissions" value={String(role.permissionCount)} />
            <DetailField
              label="Created"
              value={format(new Date(role.createdAt), "dd MMM yyyy")}
            />
            <DetailField
              label="Updated"
              value={format(new Date(role.updatedAt), "dd MMM yyyy")}
            />
            {role.parentRoleName ? (
              <DetailField label="Inherits from" value={role.parentRoleName} />
            ) : (
              <DetailField label="Inherits from" value="None" />
            )}
            {role.description ? (
              <div className="col-span-2 sm:col-span-4">
                <DetailField label="Description" value={role.description} />
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Portals</h3>
              <p className="text-xs text-muted-foreground">
                {detail.preview.modules.length} modules ·{" "}
                {detail.preview.restrictedModules.length} restricted
              </p>
            </div>
            {detail.preview.portals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No portal access mapped.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {detail.preview.portals.map((portal) => (
                  <span
                    key={portal.key}
                    className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs"
                    title={portal.route ?? undefined}
                  >
                    <span className="font-medium">{portal.label}</span>
                    {portal.route ? (
                      <span className="font-mono text-muted-foreground">{portal.route}</span>
                    ) : null}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border p-3">
            <h3 className="mb-2 text-sm font-semibold">Modules & actions</h3>
            {detail.permissionSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No permissions granted.</p>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {detail.permissionSummary.map((mod) => (
                  <div
                    key={mod.module}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md bg-muted/40 px-2.5 py-1.5"
                  >
                    <span className="shrink-0 text-sm font-medium">{mod.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {mod.permissions.map((perm) => perm.action).join(" · ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-lg border p-3">
              <h3 className="mb-2 text-sm font-semibold">Assigned users</h3>
              {detail.assignedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users assigned.</p>
              ) : (
                <ul className="max-h-36 space-y-2 overflow-y-auto pr-1">
                  {detail.assignedUsers.map((user) => (
                    <li key={user.assignmentId}>
                      <p className="text-sm font-medium">{user.name ?? "Unknown user"}</p>
                      <p className="text-xs text-muted-foreground">
                        {[user.employeeCode, user.email].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border p-3">
              <h3 className="mb-2 text-sm font-semibold">Recent audit</h3>
              {detail.auditEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events yet.</p>
              ) : (
                <ul className="max-h-36 space-y-2 overflow-y-auto pr-1">
                  {detail.auditEvents.slice(0, 8).map((event) => (
                    <li key={event.id}>
                      <p className="text-sm font-medium capitalize">
                        {event.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.actorName ?? "System"} ·{" "}
                        {format(new Date(event.occurredAt), "dd MMM yyyy HH:mm")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </Modal>
  );
}
