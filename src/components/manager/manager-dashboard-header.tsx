"use client";

import { format } from "date-fns";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  focusFilterCount,
  MANAGER_DASHBOARD_FOCUS_FILTERS,
  type ManagerDashboardFocus,
} from "@/lib/manager/dashboard-focus";
import { ManagerInviteTeammate } from "@/components/manager/manager-invite-teammate";
import type { TeamMemberSummary } from "@/lib/manager/services/team-hierarchy";
import type { ManagerActionItem, ManagerDashboardKpis } from "@/types/manager-dashboard";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

type ManagerDashboardHeaderProps = {
  teamMembers: TeamMemberSummary[];
  kpis: ManagerDashboardKpis;
  actionItems: ManagerActionItem[];
  selectedEmployeeId: string | null;
  focusFilter: ManagerDashboardFocus;
  canInviteTeamMember: boolean;
  inviteServiceReady: boolean;
  onEmployeeChange: (employeeId: string | null) => void;
  onFocusChange: (focus: ManagerDashboardFocus) => void;
};

export function ManagerDashboardHeader({
  teamMembers,
  kpis,
  actionItems,
  selectedEmployeeId,
  focusFilter,
  canInviteTeamMember,
  inviteServiceReady,
  onEmployeeChange,
  onFocusChange,
}: ManagerDashboardHeaderProps) {
  const { profile } = useAuth();
  const [now, setNow] = useState(() => new Date());

  const selectedMember = teamMembers.find((member) => member.id === selectedEmployeeId);
  const selectedMemberLabel = selectedMember
    ? `${selectedMember.fullName} · ${selectedMember.employeeCode}`
    : "Everyone on my team";

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex shrink-0 flex-col gap-3">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 px-5 py-5 shadow-sm lg:px-6 lg:py-6">
        <div className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            Manager Dashboard
          </p>
          <div className="mt-1 flex items-center justify-between gap-4">
            <h1 className="min-w-0 text-2xl font-semibold tracking-tight lg:text-3xl">
              {greetingForHour(now.getHours())}, {profile.employee.firstName}
            </h1>
            <div className="shrink-0 text-right">
              <p className="whitespace-nowrap text-sm font-medium">
                {format(now, "EEEE, d MMMM yyyy")}
              </p>
              <p className="whitespace-nowrap text-xs text-muted-foreground">
                {format(now, "hh:mm a")}
              </p>
            </div>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground lg:text-base">
            See your team&apos;s attendance, leave, and performance at a glance.
          </p>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-end xl:gap-x-6 xl:gap-y-4">
            <div className="w-full min-w-0 sm:max-w-[280px] xl:w-[280px]">
              <label className="mb-1.5 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Team member
              </label>
              <Select
                value={selectedEmployeeId ?? "all"}
                onValueChange={(value) =>
                  onEmployeeChange(value === "all" ? null : value)
                }
              >
                <SelectTrigger className="h-10 w-full bg-background">
                  <Users className="mr-2 size-4 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="Everyone on my team">
                    {selectedMemberLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  align="start"
                  alignItemWithTrigger={false}
                  className="min-w-[var(--anchor-width)] w-max max-w-[min(100vw-2rem,26rem)]"
                >
                  <SelectItem value="all">Everyone on my team</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.fullName} · {member.employeeCode}
                      {member.departmentName ? ` · ${member.departmentName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 flex-1">
              <label className="mb-1.5 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Focus filter
              </label>
              <div className="flex flex-wrap gap-2">
                {MANAGER_DASHBOARD_FOCUS_FILTERS.map((filter) => {
                  const count = focusFilterCount(filter.id, kpis, actionItems);
                  const isActive = focusFilter === filter.id;

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => onFocusChange(filter.id)}
                      className={cn(
                        "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/5",
                      )}
                    >
                      <span>{filter.label}</span>
                      {count !== null && count > 0 ? (
                        <span
                          className={cn(
                            "inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                            isActive
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <ManagerInviteTeammate
              canInvite={canInviteTeamMember}
              inviteServiceReady={inviteServiceReady}
            />
          </div>

          {focusFilter !== "all" || selectedMember ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/80 pt-3 text-sm">
              {focusFilter !== "all" ? (
                <p className="font-medium text-foreground">
                  Focused on{" "}
                  <span className="text-primary">
                    {MANAGER_DASHBOARD_FOCUS_FILTERS.find((item) => item.id === focusFilter)?.label}
                  </span>
                </p>
              ) : null}
              {selectedMember ? (
                <p className="text-muted-foreground">
                  {focusFilter !== "all" ? (
                    <span className="mr-1 text-border">|</span>
                  ) : null}
                  Showing{" "}
                  <span className="font-medium text-foreground">{selectedMember.fullName}</span>
                  {selectedMember.departmentName ? ` · ${selectedMember.departmentName}` : ""}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
