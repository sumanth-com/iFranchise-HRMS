"use client";

import { CheckCircle2, Loader2, Send, UserCheck, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { RecruitmentPagination } from "@/components/recruitment/recruitment-pagination";
import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import { updateOfferStatusAction } from "@/lib/recruitment/actions";
import { OFFER_STATUS_LABELS } from "@/lib/recruitment/constants";
import { formatCurrency } from "@/lib/recruitment/services/recruitment-utils";
import type { OfferListItem, OfferStatus, RecruitmentLookups } from "@/types/recruitment";

export function OffersManagement({
  records,
  total,
  page,
  pageSize,
  lookups,
  canOffer,
  filters,
}: {
  records: OfferListItem[];
  total: number;
  page: number;
  pageSize: number;
  lookups: RecruitmentLookups;
  canOffer: boolean;
  filters: {
    search?: string;
    jobOpeningId?: string;
    offerStatus?: string;
    departmentId?: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.set("page", "1");
    startTransition(() => router.push(`?${params.toString()}`));
  }

  function setStatus(offerId: string, offerStatus: OfferStatus) {
    startTransition(async () => {
      const result = await updateOfferStatusAction({ offerId, offerStatus });
      if (!result.success) toast.error(result.message);
      else {
        if (offerStatus === "accepted" && result.data.employeeId) {
          toast.success("Offer accepted — employee created in Employee Management");
        } else {
          toast.success(`Offer marked as ${OFFER_STATUS_LABELS[offerStatus]}`);
        }
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Offers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage offer letters. Mark Sent when the candidate receives the offer (email or call).
          Accepting an offer automatically creates the employee.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <Input
            placeholder="Search candidate..."
            defaultValue={filters.search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({ search: (e.target as HTMLInputElement).value || undefined });
              }
            }}
          />
          <LabeledSelect
            items={[
              { value: "all", label: "All positions" },
              ...lookups.jobs.map((j) => ({ value: j.id, label: j.label })),
            ]}
            value={filters.jobOpeningId ?? "all"}
            onValueChange={(v) => updateParams({ jobOpeningId: v === "all" ? undefined : v })}
          />
          <LabeledSelect
            items={[
              { value: "all", label: "All departments" },
              ...lookups.departments.map((d) => ({ value: d.id, label: d.label })),
            ]}
            value={filters.departmentId ?? "all"}
            onValueChange={(v) => updateParams({ departmentId: v === "all" ? undefined : v })}
          />
          <LabeledSelect
            items={[
              { value: "all", label: "All statuses" },
              ...toSelectItems(OFFER_STATUS_LABELS),
            ]}
            value={filters.offerStatus ?? "all"}
            onValueChange={(v) => updateParams({ offerStatus: v === "all" ? undefined : v })}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {records.length === 0 ? (
          <EmptyState
            title="No offers"
            description="Generate an offer from a candidate profile after the CEO/HR round."
            className="border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Salary</th>
                  <th className="px-4 py-3">Joining Date</th>
                  <th className="px-4 py-3">Manager</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.candidateName}</div>
                      <div className="text-xs text-muted-foreground">{row.candidateEmail}</div>
                    </td>
                    <td className="px-4 py-3">{row.jobTitle}</td>
                    <td className="px-4 py-3">{row.departmentName ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(row.salary)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.joiningDate}</td>
                    <td className="px-4 py-3">{row.reportingManagerName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <RecruitmentStatusBadge
                        label={OFFER_STATUS_LABELS[row.offerStatus]}
                        status={row.offerStatus}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {canOffer ? (
                        <div className="flex flex-wrap justify-end gap-1">
                          {row.offerStatus === "draft" ? (
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => setStatus(row.id, "sent")}
                            >
                              <Send className="mr-1 h-3.5 w-3.5" />
                              Mark Sent
                            </Button>
                          ) : null}
                          {row.offerStatus === "sent" ? (
                            <>
                              <Button
                                size="sm"
                                disabled={isPending}
                                onClick={() => setStatus(row.id, "accepted")}
                              >
                                {isPending ? (
                                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <UserCheck className="mr-1 h-3.5 w-3.5" />
                                )}
                                Accept & Hire
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isPending}
                                onClick={() => setStatus(row.id, "rejected")}
                              >
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                Rejected
                              </Button>
                            </>
                          ) : null}
                          {row.employeeId ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Employee linked
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecruitmentPagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
