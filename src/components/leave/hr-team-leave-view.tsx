"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";

import { buttonVariants, POLICY_HEADER_BUTTON_CLASS } from "@/components/common/button";
import {
  LeaveSummaryCards,
  type LeaveSummaryFilterKey,
} from "@/components/leave/leave-summary-cards";
import { LeaveTable } from "@/components/leave/leave-table";
import { TeamLeaveBalancesPanel } from "@/components/leave/team-leave-balances-panel";
import { getLeaveSummaryAction } from "@/lib/leave/actions";
import { cn } from "@/lib/utils";
import type {
  LeaveActionResult,
  LeaveListItem,
  LeaveListParams,
  LeaveListResult,
  LeaveSummary,
} from "@/types/leave";
import type { LookupOption } from "@/types/employee";

type TeamLeaveSection = "requests" | "balances";

type HrTeamLeaveViewProps = {
  summary: LeaveSummary;
  records: LeaveListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  month: number;
  year: number;
  leaveStatus?: string;
  leaveTypeId?: string;
  departmentId?: string;
  branchId?: string;
  reportingManagerId?: string;
  employeeId?: string;
  summaryFilter?: LeaveSummaryFilterKey;
  leaveTypes: LookupOption[];
  departments: LookupOption[];
  branches: LookupOption[];
  employees: LookupOption[];
  managers: LookupOption[];
  canCreate: boolean;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  canDelete: boolean;
  embedded?: boolean;
  title?: string;
  description?: string;
  policyHref?: string;
  listBasePath?: string;
  fetchRecords?: (
    params: LeaveListParams,
  ) => Promise<LeaveActionResult<LeaveListResult>>;
};

export function HrTeamLeaveView({
  summary,
  records,
  total,
  page,
  pageSize,
  search,
  month,
  year,
  leaveStatus,
  leaveTypeId,
  departmentId,
  branchId,
  reportingManagerId,
  employeeId,
  summaryFilter: initialSummaryFilter,
  leaveTypes,
  departments,
  branches,
  employees,
  managers,
  canCreate,
  canApprove,
  canReject,
  canCancel,
  canDelete,
  embedded = false,
  title = "Leave & Approvals",
  description = "Track leave requests, approvals, balances, and workforce availability across the organization.",
  policyHref,
  listBasePath,
  fetchRecords,
}: HrTeamLeaveViewProps) {
  const [summaryState, setSummaryState] = useState(summary);
  const [summaryFilter, setSummaryFilter] = useState<LeaveSummaryFilterKey | undefined>(
    initialSummaryFilter,
  );
  const [section, setSection] = useState<TeamLeaveSection>("requests");
  const [balancesMounted, setBalancesMounted] = useState(false);

  useEffect(() => {
    setSummaryState(summary);
  }, [summary]);

  const refreshSummary = useCallback(async () => {
    if (fetchRecords) return;
    const result = await getLeaveSummaryAction();
    if (result.success) setSummaryState(result.data);
  }, [fetchRecords]);

  const applySummaryFilter = useCallback((key: LeaveSummaryFilterKey) => {
    setSummaryFilter((current) => (current === key ? undefined : key));
  }, []);

  function openSection(next: TeamLeaveSection) {
    setSection(next);
    if (next === "balances") setBalancesMounted(true);
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {policyHref ? (
            <Link
              href={policyHref}
              className={cn(
                buttonVariants({ variant: "outline" }),
                POLICY_HEADER_BUTTON_CLASS,
                "shrink-0 gap-1.5",
              )}
            >
              <FileText className="size-4" />
              Leave Policy
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-start">
        <nav
          className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
          aria-label="Team leave sections"
        >
          {(
            [
              { id: "requests" as const, title: "Leave Requests" },
              { id: "balances" as const, title: "Leave Balance" },
            ] as const
          ).map((item) => {
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openSection(item.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.title}
              </button>
            );
          })}
        </nav>
      </div>

      {section === "requests" ? (
        <>
          <LeaveSummaryCards
            summary={summaryState}
            activeKey={summaryFilter}
            onSelect={applySummaryFilter}
          />

          <LeaveTable
            records={records}
            total={total}
            page={page}
            pageSize={pageSize}
            search={search}
            month={month}
            year={year}
            leaveStatus={leaveStatus}
            leaveTypeId={leaveTypeId}
            departmentId={departmentId}
            branchId={branchId}
            reportingManagerId={reportingManagerId}
            employeeId={employeeId}
            summaryFilter={summaryFilter}
            onSummaryFilterChange={setSummaryFilter}
            leaveTypes={leaveTypes}
            departments={departments}
            branches={branches}
            employees={employees}
            managers={managers}
            canCreate={canCreate}
            canApprove={canApprove}
            canReject={canReject}
            canCancel={canCancel}
            canDelete={canDelete}
            embedded={embedded}
            listBasePath={listBasePath}
            fetchRecords={fetchRecords}
            onMutated={() => {
              void refreshSummary();
            }}
          />
        </>
      ) : null}

      {balancesMounted ? (
        <div className={section === "balances" ? "block" : "hidden"}>
          <TeamLeaveBalancesPanel
            initialDepartments={departments}
            initialYear={year}
          />
        </div>
      ) : null}
    </div>
  );
}
