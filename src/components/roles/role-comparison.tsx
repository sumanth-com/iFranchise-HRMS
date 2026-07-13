"use client";

import { GitCompare, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { compareRolesAction } from "@/lib/roles/actions";
import type { LookupOption } from "@/types/employee";
import type { PermissionCatalogItem, RoleComparison } from "@/types/roles";

type Props = {
  roles: LookupOption[];
  permissionCodes: string[];
};

function formatModuleName(module: string) {
  return module
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function moduleSummary(items: PermissionCatalogItem[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.module, (map.get(item.module) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5);
}

function PermissionList({
  items,
  emptyLabel,
  accentClass,
  badgeClass,
}: {
  items: PermissionCatalogItem[];
  emptyLabel: string;
  accentClass: string;
  badgeClass: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed bg-muted/30 px-4 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
      {items.map((perm) => (
        <li
          key={perm.id}
          className={`rounded-xl border px-3 py-2.5 text-sm shadow-sm transition-colors hover:bg-background ${accentClass}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{perm.code}</p>
              <p className="text-xs text-muted-foreground">
                {formatModuleName(perm.module)} · {perm.action}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}>
              {perm.action}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PermissionSummaryCard({
  label,
  value,
  helper,
  className,
}: {
  label: string;
  value: number;
  helper: string;
  className: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{helper}</p>
    </div>
  );
}

function ModulePills({ items }: { items: PermissionCatalogItem[] }) {
  const modules = moduleSummary(items);
  if (modules.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {modules.map(([module, count]) => (
        <span
          key={module}
          className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground"
        >
          {formatModuleName(module)} · {count}
        </span>
      ))}
    </div>
  );
}

export function RoleComparison({ roles }: Props) {
  const [roleAId, setRoleAId] = useState<string>("");
  const [roleBId, setRoleBId] = useState<string>("");
  const [comparison, setComparison] = useState<RoleComparison | null>(null);
  const [isPending, startTransition] = useTransition();

  const roleItems = useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.label })),
    [roles],
  );

  function onCompare() {
    if (!roleAId || !roleBId) {
      toast.error("Select two roles to compare");
      return;
    }
    if (roleAId === roleBId) {
      toast.error("Select two different roles");
      return;
    }

    startTransition(async () => {
      const res = await compareRolesAction({ roleAId, roleBId });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setComparison(res.data);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compare Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Side-by-side comparison of effective permissions between two roles.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid items-end gap-4 md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_10rem]">
          <div className="space-y-2">
            <p className="text-sm font-medium">Role A</p>
            <LabeledSelect
              items={roleItems}
              value={roleAId}
              onValueChange={setRoleAId}
              placeholder="Select role"
              triggerClassName="h-10 w-full"
              contentClassName="min-w-64"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Role B</p>
            <LabeledSelect
              items={roleItems}
              value={roleBId}
              onValueChange={setRoleBId}
              placeholder="Select role"
              triggerClassName="h-10 w-full"
              contentClassName="min-w-64"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-transparent">Action</p>
            <Button onClick={onCompare} disabled={isPending} className="h-10 w-full justify-center">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GitCompare className="mr-2 h-4 w-4" />
              )}
              Compare
            </Button>
          </div>
        </div>
      </div>

      {comparison ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <PermissionSummaryCard
              label={comparison.roleA.name}
              value={comparison.onlyInA.length}
              helper="Unique permissions"
              className="border-blue-200 bg-blue-50 text-blue-900"
            />
            <PermissionSummaryCard
              label="Shared Access"
              value={comparison.shared.length}
              helper="Permissions common to both roles"
              className="border-emerald-200 bg-emerald-50 text-emerald-900"
            />
            <PermissionSummaryCard
              label={comparison.roleB.name}
              value={comparison.onlyInB.length}
              helper="Unique permissions"
              className="border-orange-200 bg-orange-50 text-orange-900"
            />
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-4 text-primary" />
                  Permission Match Overview
                </h2>
                <p className="text-xs text-muted-foreground">
                  Quickly see what is shared and what makes each role different.
                </p>
              </div>
              <ModulePills items={comparison.shared} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr_1fr]">
              <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-blue-800">
                      Only in {comparison.roleA.name}
                    </h3>
                    <p className="text-xs text-blue-700/70">Extra access on left role</p>
                  </div>
                  <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                    {comparison.onlyInA.length}
                  </span>
                </div>
                <PermissionList
                  items={comparison.onlyInA}
                  emptyLabel="This role has no extra permissions."
                  accentClass="border-blue-200 bg-white/80"
                  badgeClass="bg-blue-100 text-blue-700"
                />
              </section>

              <section className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
                <div className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-emerald-200/40 blur-2xl" />
                <div className="relative mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                      <ShieldCheck className="size-4" />
                      Shared Permissions
                    </h3>
                    <p className="text-xs text-emerald-700/70">
                      Access both roles already have in common
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                    {comparison.shared.length}
                  </span>
                </div>
                <PermissionList
                  items={comparison.shared}
                  emptyLabel="No shared permissions between these roles."
                  accentClass="border-emerald-200 bg-white/85"
                  badgeClass="bg-emerald-100 text-emerald-700"
                />
              </section>

              <section className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-orange-800">
                      Only in {comparison.roleB.name}
                    </h3>
                    <p className="text-xs text-orange-700/70">Extra access on right role</p>
                  </div>
                  <span className="rounded-full bg-orange-600 px-2.5 py-1 text-xs font-semibold text-white">
                    {comparison.onlyInB.length}
                  </span>
                </div>
                <PermissionList
                  items={comparison.onlyInB}
                  emptyLabel="This role has no extra permissions."
                  accentClass="border-orange-200 bg-white/80"
                  badgeClass="bg-orange-100 text-orange-700"
                />
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
