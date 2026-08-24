"use client";

import { Check, GitCompare, Loader2, Minus } from "lucide-react";
import { Fragment, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { compareRolesAction } from "@/lib/roles/actions";
import type { LookupOption } from "@/types/employee";
import type { PermissionCatalogItem, RoleComparison as RoleComparisonData } from "@/types/roles";

type Props = {
  roles: LookupOption[];
  permissionCodes: string[];
};

type ViewFilter = "differences" | "shared" | "all";

type ComparisonRow = {
  permission: PermissionCatalogItem;
  inA: boolean;
  inB: boolean;
};

type ModuleGroup = {
  module: string;
  label: string;
  rows: ComparisonRow[];
};

function formatModuleName(module: string) {
  return module
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function permissionLabel(perm: PermissionCatalogItem) {
  if (perm.description?.trim()) return perm.description.trim();
  const action = perm.action
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return `${action} · ${formatModuleName(perm.module)}`;
}

function buildGroups(
  comparison: RoleComparisonData,
  filter: ViewFilter,
): ModuleGroup[] {
  const map = new Map<string, ComparisonRow>();

  for (const perm of comparison.onlyInA) {
    map.set(perm.id, { permission: perm, inA: true, inB: false });
  }
  for (const perm of comparison.onlyInB) {
    map.set(perm.id, { permission: perm, inA: false, inB: true });
  }
  for (const perm of comparison.shared) {
    map.set(perm.id, { permission: perm, inA: true, inB: true });
  }

  const rows = Array.from(map.values()).filter((row) => {
    if (filter === "shared") return row.inA && row.inB;
    if (filter === "differences") return row.inA !== row.inB;
    return true;
  });

  const byModule = new Map<string, ComparisonRow[]>();
  for (const row of rows) {
    const key = row.permission.module;
    const list = byModule.get(key) ?? [];
    list.push(row);
    byModule.set(key, list);
  }

  return Array.from(byModule.entries())
    .map(([module, moduleRows]) => ({
      module,
      label: formatModuleName(module),
      rows: moduleRows.sort((a, b) =>
        permissionLabel(a.permission).localeCompare(permissionLabel(b.permission)),
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function AccessMark({ has }: { has: boolean }) {
  if (has) {
    return (
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="size-3.5" strokeWidth={2.5} aria-label="Has access" />
      </span>
    );
  }

  return (
    <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Minus className="size-3.5" aria-label="No access" />
    </span>
  );
}

export function RoleComparison({ roles }: Props) {
  const [roleAId, setRoleAId] = useState<string>("");
  const [roleBId, setRoleBId] = useState<string>("");
  const [comparison, setComparison] = useState<RoleComparisonData | null>(null);
  const [filter, setFilter] = useState<ViewFilter>("differences");
  const [isPending, startTransition] = useTransition();

  const roleItems = useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.label })),
    [roles],
  );

  const groups = useMemo(
    () => (comparison ? buildGroups(comparison, filter) : []),
    [comparison, filter],
  );

  const visibleCount = useMemo(
    () => groups.reduce((sum, group) => sum + group.rows.length, 0),
    [groups],
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
      setFilter("differences");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compare Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          See what each role can do — and where they differ.
        </p>
      </div>

      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
        <div className="min-w-[160px] max-w-xs flex-1 basis-[180px]">
          <LabeledSelect
            items={roleItems}
            value={roleAId}
            onValueChange={setRoleAId}
            placeholder="Role A"
            triggerClassName="h-9 w-full"
            contentClassName="min-w-64"
          />
        </div>
        <div className="min-w-[160px] max-w-xs flex-1 basis-[180px]">
          <LabeledSelect
            items={roleItems}
            value={roleBId}
            onValueChange={setRoleBId}
            placeholder="Role B"
            triggerClassName="h-9 w-full"
            contentClassName="min-w-64"
          />
        </div>
        <div className="ml-auto shrink-0">
          <Button onClick={onCompare} disabled={isPending} className="h-9">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GitCompare className="mr-2 h-4 w-4" />
            )}
            Compare
          </Button>
        </div>
      </div>

      {comparison ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Only in {comparison.roleA.name}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {comparison.onlyInA.length}
              </p>
            </div>
            <div className="rounded-xl border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Shared by both</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {comparison.shared.length}
              </p>
            </div>
            <div className="rounded-xl border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Only in {comparison.roleB.name}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {comparison.onlyInB.length}
              </p>
            </div>
          </div>

          <div className="flex flex-nowrap items-center gap-2">
            <div className="w-full max-w-xs">
              <LabeledSelect
                items={[
                  {
                    value: "differences",
                    label: `Where they differ (${comparison.onlyInA.length + comparison.onlyInB.length})`,
                  },
                  {
                    value: "shared",
                    label: `What both share (${comparison.shared.length})`,
                  },
                  {
                    value: "all",
                    label: `All permissions (${comparison.onlyInA.length + comparison.onlyInB.length + comparison.shared.length})`,
                  },
                ]}
                value={filter}
                onValueChange={(value) => setFilter(value as ViewFilter)}
                placeholder="Show"
                triggerClassName="h-9 w-full"
              />
            </div>
            <p className="shrink-0 text-xs text-muted-foreground">
              {visibleCount} shown
            </p>
          </div>

          <div className="overflow-auto rounded-xl border bg-card max-h-[min(70vh,calc(100dvh-16rem))] [scrollbar-gutter:stable]">
            {groups.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                {filter === "differences"
                  ? "These roles have the same permissions."
                  : filter === "shared"
                    ? "These roles have nothing in common."
                    : "No permissions to show."}
              </div>
            ) : (
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="sticky top-0 z-30 bg-black text-left shadow-[0_1px_0_rgba(255,255,255,0.08)]">
                  <tr className="border-white/10 bg-black hover:bg-black">
                    <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Permission</th>
                    <th className="h-11 w-28 whitespace-nowrap bg-black px-3 py-3 text-center align-middle text-xs font-semibold uppercase tracking-wide text-white">
                      {comparison.roleA.name}
                    </th>
                    <th className="h-11 w-28 whitespace-nowrap bg-black px-3 py-3 text-center align-middle text-xs font-semibold uppercase tracking-wide text-white">
                      {comparison.roleB.name}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <FragmentGroup key={group.module} group={group} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FragmentGroup({ group }: { group: ModuleGroup }) {
  return (
    <Fragment>
      <tr className="border-b bg-muted/20">
        <td
          colSpan={3}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {group.label}
          <span className="ml-2 font-normal normal-case tracking-normal">
            · {group.rows.length}
          </span>
        </td>
      </tr>
      {group.rows.map((row) => (
        <tr key={row.permission.id} className="border-b last:border-b-0 hover:bg-muted/20">
          <td className="px-4 py-2.5">
            <p className="font-medium text-foreground">{permissionLabel(row.permission)}</p>
            <p className="text-xs text-muted-foreground capitalize">{row.permission.action}</p>
          </td>
          <td className="px-3 py-2.5 text-center">
            <div className="flex justify-center">
              <AccessMark has={row.inA} />
            </div>
          </td>
          <td className="px-3 py-2.5 text-center">
            <div className="flex justify-center">
              <AccessMark has={row.inB} />
            </div>
          </td>
        </tr>
      ))}
    </Fragment>
  );
}
