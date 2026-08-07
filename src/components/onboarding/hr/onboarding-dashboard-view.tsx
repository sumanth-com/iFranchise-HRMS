"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, UserPlus } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { FilterSelect } from "@/components/common/filter-select";
import { CreateOnboardingDialog } from "@/components/onboarding/hr/create-onboarding-dialog";
import { fetchOnboardingModuleAction } from "@/lib/onboarding/actions/hr-onboarding-actions";
import type { OnboardingModuleData } from "@/lib/onboarding/loaders/hr-onboarding-loaders";
import { assignOnboardingRouteRefs } from "@/lib/onboarding/routing";
import { ONBOARDING_ROUTES, ONBOARDING_STATUS_LABELS, ONBOARDING_STATUSES } from "@/types/onboarding";
import type { OnboardingListParams } from "@/types/onboarding";

type OnboardingDashboardViewProps = OnboardingModuleData & {
  initialFilters: OnboardingListParams;
};

function statusBadgeClass(status: string) {
  if (status === "pending_hr_review") return "bg-amber-100 text-amber-800";
  if (status === "employee_created" || status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "rejected" || status === "cancelled") return "bg-red-100 text-red-800";
  if (status === "corrections_requested") return "bg-orange-100 text-orange-800";
  return "bg-slate-100 text-slate-700";
}

export function OnboardingDashboardView({
  stats: initialStats,
  cases: initialCases,
  lookups,
  initialFilters,
}: OnboardingDashboardViewProps) {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);
  const [cases, setCases] = useState(initialCases);
  const [filters, setFilters] = useState(initialFilters);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback((next: OnboardingListParams) => {
    startTransition(async () => {
      const data = await fetchOnboardingModuleAction(next);
      setStats(data.stats);
      setCases(data.cases);
    });
  }, []);

  function applyFilter(patch: Partial<OnboardingListParams>) {
    const next = { ...filters, ...patch, page: patch.page ?? 1 };
    setFilters(next);
    refresh(next);
  }

  const statCards = [
    { label: "Total", value: stats.total, key: "" },
    { label: "Pending review", value: stats.pendingReview, key: "pending_hr_review" },
    { label: "In progress", value: stats.inProgress, key: "in_progress" },
    { label: "Completed", value: stats.completed, key: "employee_created" },
  ];

  const routeRefs = assignOnboardingRouteRefs(
    cases.data.map((row) => ({ id: row.id, fullName: row.fullName })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employee Onboarding</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pre-joining onboarding for new hires before company account creation
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Hire
        </Button>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => applyFilter({ status: card.key || undefined })}
            className="rounded-xl border bg-card p-4 text-left transition hover:border-primary/40"
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="text-2xl font-semibold mt-1">{card.value}</p>
          </button>
        ))}
      </div>

      <div className="flex w-full flex-wrap items-center gap-3">
        <Input
          placeholder="Search name or email..."
          value={filters.search ?? ""}
          onChange={(e) => applyFilter({ search: e.target.value || undefined })}
          className="max-w-xs"
        />
        <FilterSelect
          value={filters.status ?? ""}
          onValueChange={(v) => applyFilter({ status: v || undefined })}
          placeholder="All statuses"
          items={ONBOARDING_STATUSES.map((s) => ({
            value: s,
            label: ONBOARDING_STATUS_LABELS[s],
          }))}
        />
      </div>

      {cases.data.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-5 w-5" />}
          title="No onboarding cases"
          description="Create a new hire to send a pre-joining onboarding invitation."
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
                  <td className="p-3">{row.intendedRoleName}</td>
                  <td className="p-3">{row.joiningDate ?? "—"}</td>
                  <td className="p-3">{row.completionPercent}%</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}>
                      {ONBOARDING_STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={ONBOARDING_ROUTES.hrDetail(routeRefs.get(row.id) ?? row.id)}
                      className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                    >
                      <ClipboardList className="h-4 w-4 mr-1" />
                      Review
                    </Link>
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

      <CreateOnboardingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        lookups={lookups}
        onSuccess={(caseId, fullName) => {
          setCreateOpen(false);
          toast.success("Onboarding invitation sent");
          const routeRef = assignOnboardingRouteRefs([
            ...cases.data.map((row) => ({ id: row.id, fullName: row.fullName })),
            { id: caseId, fullName },
          ]).get(caseId) ?? caseId;
          router.push(ONBOARDING_ROUTES.hrDetail(routeRef));
        }}
      />
    </div>
  );
}
