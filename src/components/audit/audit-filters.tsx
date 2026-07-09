"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { FilterSelect } from "@/components/common/filter-select";
import { Input } from "@/components/common/input";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  AUDIT_PRIORITIES,
  AUDIT_ROUTES,
} from "@/lib/audit/constants";
import { toLookupSelectItems, withSelectOption } from "@/components/payroll/select-utils";
import type { LookupOption } from "@/types/employee";

type Props = {
  users: LookupOption[];
  roles: LookupOption[];
  filters: {
    search?: string;
    userId?: string;
    roleId?: string;
    module?: string;
    action?: string;
    status?: string;
    priority?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  basePath?: string;
};

const STATUS_ITEMS = [
  { value: "all", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

export function AuditFilters({ users, roles, filters, basePath = AUDIT_ROUTES.logs }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userItems = useMemo(
    () => withSelectOption(toLookupSelectItems(users), { value: "all", label: "All users" }),
    [users],
  );
  const roleItems = useMemo(
    () => withSelectOption(toLookupSelectItems(roles), { value: "all", label: "All roles" }),
    [roles],
  );
  const moduleItems = useMemo(
    () =>
      withSelectOption(
        AUDIT_MODULES.map((m) => ({ value: m.value, label: m.label })),
        { value: "all", label: "All modules" },
      ),
    [],
  );
  const actionItems = useMemo(
    () =>
      withSelectOption(
        AUDIT_ACTIONS.map((a) => ({ value: a.value, label: a.label })),
        { value: "all", label: "All actions" },
      ),
    [],
  );
  const priorityItems = useMemo(
    () =>
      withSelectOption(
        AUDIT_PRIORITIES.map((p) => ({ value: p.value, label: p.label })),
        { value: "all", label: "All priorities" },
      ),
    [],
  );

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      router.push(`${basePath}?${params.toString()}`);
    },
    [router, searchParams, basePath],
  );

  return (
    <div className="sticky top-0 z-10 rounded-xl border bg-card/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1 xl:col-span-2">
          <p className="text-xs font-medium text-muted-foreground">Search</p>
          <Input
            placeholder="Search description, record, action..."
            defaultValue={filters.search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setParams({ search: e.currentTarget.value || undefined, page: "1" });
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">User</p>
          <FilterSelect
            items={userItems}
            value={filters.userId ?? "all"}
            placeholder="All users"
            onValueChange={(v) =>
              setParams({ userId: v === "all" ? undefined : v, page: "1" })
            }
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Role</p>
          <FilterSelect
            items={roleItems}
            value={filters.roleId ?? "all"}
            placeholder="All roles"
            onValueChange={(v) =>
              setParams({ roleId: v === "all" ? undefined : v, page: "1" })
            }
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Module</p>
          <FilterSelect
            items={moduleItems}
            value={filters.module ?? "all"}
            placeholder="All modules"
            onValueChange={(v) =>
              setParams({ module: v === "all" ? undefined : v, page: "1" })
            }
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Action</p>
          <FilterSelect
            items={actionItems}
            value={filters.action ?? "all"}
            placeholder="All actions"
            onValueChange={(v) =>
              setParams({ action: v === "all" ? undefined : v, page: "1" })
            }
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Status</p>
          <FilterSelect
            items={STATUS_ITEMS}
            value={filters.status ?? "all"}
            placeholder="All statuses"
            onValueChange={(v) =>
              setParams({ status: v === "all" ? undefined : v, page: "1" })
            }
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Priority</p>
          <FilterSelect
            items={priorityItems}
            value={filters.priority ?? "all"}
            placeholder="All priorities"
            onValueChange={(v) =>
              setParams({ priority: v === "all" ? undefined : v, page: "1" })
            }
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">From</p>
          <Input type="date" defaultValue={filters.dateFrom} onChange={(e) => setParams({ dateFrom: e.target.value || undefined, page: "1" })} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">To</p>
          <Input type="date" defaultValue={filters.dateTo} onChange={(e) => setParams({ dateTo: e.target.value || undefined, page: "1" })} />
        </div>
      </div>
    </div>
  );
}
