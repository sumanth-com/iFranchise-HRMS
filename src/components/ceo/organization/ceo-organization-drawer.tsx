"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchCeoOrgEmployeeDetailAction } from "@/lib/ceo/actions/ceo-organization-actions";
import type { CeoOrgEmployeeDetail } from "@/types/ceo-organization";

type CeoOrganizationDrawerProps = {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background/80 px-3 py-2.5">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

export function CeoOrganizationDrawer({
  employeeId,
  open,
  onOpenChange,
}: CeoOrganizationDrawerProps) {
  const [detail, setDetail] = useState<CeoOrgEmployeeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !employeeId) {
      setDetail(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      const result = await fetchCeoOrgEmployeeDetailAction(employeeId);
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  }, [open, employeeId]);

  const employee = detail?.employee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          <DialogTitle>Employee Profile</DialogTitle>
        </DialogHeader>

        {isPending ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading profile…
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        ) : employee ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <EmployeeAvatar
                firstName={employee.firstName}
                lastName={employee.lastName}
                profileImagePath={employee.profile?.profileImageStoragePath}
                className="size-14"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">
                  {employee.firstName} {employee.lastName}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {employee.employeeCode}
                  {employee.designationTitle ? ` · ${employee.designationTitle}` : ""}
                </p>
                <div className="mt-1">
                  <EmploymentStatusBadge status={employee.employmentStatus} />
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Employee ID" value={employee.employeeCode} />
              <Field label="Department" value={employee.departmentName} />
              <Field label="Designation" value={employee.designationTitle} />
              <Field label="Manager" value={employee.reportingManagerName} />
              <Field label="Email" value={employee.email} />
              <Field label="Phone" value={employee.phone} />
              <Field
                label="Joining Date"
                value={
                  employee.dateOfJoining
                    ? format(new Date(employee.dateOfJoining), "d MMM yyyy")
                    : null
                }
              />
              <Field
                label="Experience"
                value={
                  detail.experienceYears != null
                    ? `${detail.experienceYears} years`
                    : null
                }
              />
              <Field label="Employment Type" value={employee.employmentTypeName} />
              <Field label="Current Status" value={employee.employmentStatus} />
              <Field
                label="Performance Rating"
                value={
                  detail.performanceRating != null
                    ? detail.performanceRating.toFixed(1)
                    : null
                }
              />
              <Field
                label="Recent Salary Revision"
                value={
                  detail.recentSalaryRevisionDate
                    ? format(new Date(detail.recentSalaryRevisionDate), "d MMM yyyy")
                    : null
                }
              />
            </div>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Reporting Hierarchy</h3>
              {detail.reportingChain.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No manager assigned.</p>
              ) : (
                <ol className="mt-2 space-y-1.5">
                  {detail.reportingChain.map((item, index) => (
                    <li key={item.id} className="text-sm">
                      <span className="text-muted-foreground">{index + 1}. </span>
                      {item.fullName}
                      {item.designationTitle ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {item.designationTitle}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Attendance Summary</h3>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Records</p>
                  <p className="font-semibold tabular-nums">
                    {detail.attendanceSummary.totalRecords}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Present Days</p>
                  <p className="font-semibold tabular-nums">
                    {detail.attendanceSummary.presentDays}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Work Hours</p>
                  <p className="font-semibold tabular-nums">
                    {detail.attendanceSummary.totalWorkHours}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Leave Balance</h3>
              {detail.leaveBalances.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No leave balances.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {detail.leaveBalances.map((balance) => (
                    <li
                      key={balance.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>{balance.leaveTypeName}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {balance.balanceDays} days
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Recent Promotions</h3>
              {detail.recentPromotions.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No promotions recorded.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {detail.recentPromotions.map((promotion) => (
                    <li key={promotion.id} className="text-sm">
                      <span className="font-medium">
                        {promotion.recommendedDesignation ?? "Promotion"}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {promotion.promotionStatus} ·{" "}
                        {format(new Date(promotion.createdAt), "d MMM yyyy")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-xs text-muted-foreground">
              CEO access is view-only. Employee records cannot be edited from this portal.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
