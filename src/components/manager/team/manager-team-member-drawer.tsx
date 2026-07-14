"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import { EmployeeIdCard } from "@/components/employees/employee-id-card";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { FeedbackTypeBadge } from "@/components/performance/performance-status-badge";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createTeamFeedbackAction,
  createTeamOneOnOneAction,
  createTeamPromotionAction,
  fetchTeamMemberDetailAction,
} from "@/lib/manager/actions/team-actions";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { ASSIGNMENT_STATUS_LABELS } from "@/lib/assets/constants";
import { FEEDBACK_TYPE_LABELS, FEEDBACK_VISIBILITY_LABELS } from "@/lib/performance/constants";
import { feedbackFormSchema, oneOnOneFormSchema, promotionFormSchema } from "@/lib/validations/performance";
import type { LookupOption } from "@/types/employee";
import type { TeamMemberDetailBundle } from "@/types/manager-team";
import type { LeaveStatus } from "@/types/leave";
import { cn } from "@/lib/utils";

export type TeamMemberDrawerTab =
  | "overview"
  | "attendance"
  | "leave"
  | "performance"
  | "documents"
  | "assets";

const DRAWER_TABS: { id: TeamMemberDrawerTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "attendance", label: "Attendance" },
  { id: "leave", label: "Leave" },
  { id: "performance", label: "Performance" },
  { id: "documents", label: "Documents" },
  { id: "assets", label: "Assets" },
];

function resolveInitialTab(
  tab: TeamMemberDrawerTab,
  readOnly: boolean,
): TeamMemberDrawerTab {
  if (!readOnly) return tab;
  if (tab === "performance") return "overview";
  return tab;
}

function getVisibleTabs(readOnly: boolean) {
  if (!readOnly) return DRAWER_TABS;
  return [
    { id: "overview" as const, label: "Profile" },
    { id: "attendance" as const, label: "Attendance" },
    { id: "leave" as const, label: "Leave" },
    { id: "documents" as const, label: "Documents" },
    { id: "assets" as const, label: "Assets" },
  ];
}

export const MANAGER_TEAM_PROFILE_TABS = getVisibleTabs(true);

export function ManagerTeamMemberTabBar({
  tabs,
  activeTab,
  onTabChange,
  className,
}: {
  tabs: { id: TeamMemberDrawerTab; label: string }[];
  activeTab: TeamMemberDrawerTab;
  onTabChange: (tab: TeamMemberDrawerTab) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 overflow-x-auto", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
            activeTab === tab.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

type ManagerTeamMemberDrawerProps = {
  employeeId: string | null;
  initialTab?: TeamMemberDrawerTab;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMemberOptions: LookupOption[];
  designationOptions: LookupOption[];
  managerEmployeeId: string;
  readOnly?: boolean;
  embedded?: boolean;
  hideTabBar?: boolean;
  controlledActiveTab?: TeamMemberDrawerTab;
  onActiveTabChange?: (tab: TeamMemberDrawerTab) => void;
};

export function ManagerTeamMemberDrawer({
  employeeId,
  initialTab = "overview",
  open,
  onOpenChange,
  teamMemberOptions,
  designationOptions,
  managerEmployeeId,
  readOnly = false,
  embedded = false,
  hideTabBar = false,
  controlledActiveTab,
  onActiveTabChange,
}: ManagerTeamMemberDrawerProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<TeamMemberDrawerTab>(
    resolveInitialTab(initialTab, readOnly),
  );
  const [detail, setDetail] = useState<TeamMemberDetailBundle | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [actionMode, setActionMode] = useState<
    "feedback" | "oneOnOne" | "promotion" | "concern" | null
  >(null);

  const isControlled = controlledActiveTab !== undefined;
  const activeTab = isControlled ? controlledActiveTab : internalActiveTab;

  const setActiveTab = (tab: TeamMemberDrawerTab) => {
    if (isControlled) {
      onActiveTabChange?.(tab);
      return;
    }
    setInternalActiveTab(tab);
  };

  useEffect(() => {
    if ((!open && !embedded) || !employeeId) return;
    const nextTab = resolveInitialTab(initialTab, readOnly);
    if (isControlled) {
      onActiveTabChange?.(nextTab);
    } else {
      setInternalActiveTab(nextTab);
    }
    setDetail(null);
    startLoading(async () => {
      const bundle = await fetchTeamMemberDetailAction(employeeId);
      setDetail(bundle);
    });
  }, [open, embedded, employeeId, initialTab, isControlled, onActiveTabChange, readOnly]);

  const employee = detail?.employee;
  const visibleTabs = getVisibleTabs(readOnly);
  const showProfileLayout = readOnly && embedded;

  const profileBody = (
    <>
      {!embedded ? (
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>
            {employee ? `${employee.firstName} ${employee.lastName}` : "Team member"}
          </SheetTitle>
        </SheetHeader>
      ) : null}

      {isLoading && !detail ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !employee ? (
        <div className="p-6">
          <EmptyState title="Employee not found" description="This team member could not be loaded." />
        </div>
      ) : (
        <>
          {!showProfileLayout ? (
            <div className={cn("border-b px-6 py-4", embedded && "rounded-t-xl border-x border-t bg-card")}>
              <div className="flex items-start gap-4">
                <EmployeeAvatar
                  firstName={employee.firstName}
                  lastName={employee.lastName}
                  profileImagePath={employee.profile?.profileImageStoragePath ?? null}
                  signedUrl={detail.profileImageUrl}
                  className="size-12"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      {employee.firstName} {employee.lastName}
                    </h2>
                    <EmploymentStatusBadge status={employee.employmentStatus} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {employee.employeeCode}
                    {employee.designationTitle ? ` · ${employee.designationTitle}` : ""}
                    {employee.departmentName ? ` · ${employee.departmentName}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">{employee.email}</p>
                </div>
              </div>

              {!readOnly ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setActionMode("feedback")}>
                    Add feedback
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setActionMode("oneOnOne")}>
                    Schedule 1:1
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setActionMode("promotion")}>
                    Recommend promotion
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setActionMode("concern")}>
                    Raise concern
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {showProfileLayout ? (
            <div className="rounded-xl border bg-card px-6 py-6">
              <TeamMemberEmbeddedTabContent activeTab={activeTab} detail={detail} />
            </div>
          ) : null}

          {!hideTabBar ? (
            <div
              className={cn(
                "border-b px-6",
                embedded && !showProfileLayout && "border-x bg-card",
                showProfileLayout && "mt-4 rounded-t-xl border-x border-t bg-card",
              )}
            >
              <ManagerTeamMemberTabBar
                tabs={visibleTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                className="py-2"
              />
            </div>
          ) : null}

          {!showProfileLayout ? (
            <div
              className={cn(
                "flex-1 overflow-y-auto px-6 py-4",
                embedded && !hideTabBar && "rounded-b-xl border-x border-b bg-card",
                showProfileLayout && !hideTabBar && "border-x bg-card",
              )}
            >
              {!readOnly && activeTab === "overview" ? <OverviewTab detail={detail} /> : null}
              {activeTab === "attendance" ? <AttendanceTab detail={detail} /> : null}
              {activeTab === "leave" ? <LeaveTab detail={detail} /> : null}
              {activeTab === "performance" ? <PerformanceTab detail={detail} /> : null}
              {activeTab === "documents" ? <DocumentsTab detail={detail} /> : null}
              {activeTab === "assets" ? <AssetsTab detail={detail} /> : null}
            </div>
          ) : null}
        </>
      )}

      {!readOnly && actionMode && employee ? (
        <ActionPanel
          mode={actionMode}
          employeeId={employee.id}
          managerEmployeeId={managerEmployeeId}
          teamMemberOptions={teamMemberOptions}
          designationOptions={designationOptions}
          onClose={() => setActionMode(null)}
          onSuccess={() => {
            setActionMode(null);
            startLoading(async () => {
              const bundle = await fetchTeamMemberDetailAction(employee.id);
              setDetail(bundle);
            });
          }}
        />
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div className={cn("flex flex-col", !hideTabBar && "min-h-[32rem]")}>{profileBody}</div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        {profileBody}
      </SheetContent>
    </Sheet>
  );
}

function TeamMemberTabHeader({ detail }: { detail: TeamMemberDetailBundle }) {
  const employee = detail.employee;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <h2 className="text-lg font-semibold">
        {employee.firstName} {employee.lastName}
      </h2>
      <EmploymentStatusBadge status={employee.employmentStatus} />
    </div>
  );
}

function formatWorkHours(hours: number) {
  if (hours <= 0) return "—";
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes <= 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

function TeamMemberEmbeddedTabContent({
  activeTab,
  detail,
}: {
  activeTab: TeamMemberDrawerTab;
  detail: TeamMemberDetailBundle;
}) {
  if (activeTab === "overview") {
    return <TeamMemberProfileLayout detail={detail} />;
  }

  return (
    <div className="space-y-4">
      <TeamMemberTabHeader detail={detail} />
      {activeTab === "attendance" ? <TeamMemberAttendancePanel detail={detail} /> : null}
      {activeTab === "leave" ? <LeaveTab detail={detail} /> : null}
      {activeTab === "documents" ? <DocumentsTab detail={detail} /> : null}
      {activeTab === "assets" ? <AssetsTab detail={detail} /> : null}
    </div>
  );
}

function AttendanceSummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="flex min-h-[4.5rem] flex-col justify-between rounded-xl border bg-card px-3 py-2.5 shadow-sm">
      <p className="line-clamp-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("text-xl font-semibold tracking-tight tabular-nums", accent)}>{value}</p>
    </div>
  );
}

function TeamMemberAttendancePanel({ detail }: { detail: TeamMemberDetailBundle }) {
  const records = detail.attendance;
  const summary = detail.attendanceSummary;
  const absentDays = records.filter((row) => row.attendance_status === "absent").length;
  const lateDays = records.filter((row) => row.attendance_status === "late").length;
  const halfDays = records.filter((row) => row.attendance_status === "half_day").length;

  const columns: DataTableColumn<Record<string, unknown>>[] = [
    {
      key: "attendance_date",
      header: "Date",
      render: (row) =>
        row.attendance_date
          ? format(new Date(String(row.attendance_date)), "EEE, d MMM yyyy")
          : "—",
    },
    {
      key: "attendance_status",
      header: "Status",
      render: (row) =>
        row.attendance_status ? (
          <AttendanceStatusBadge status={row.attendance_status as never} />
        ) : (
          "—"
        ),
    },
    {
      key: "check_in_at",
      header: "Check in",
      render: (row) =>
        row.check_in_at ? format(new Date(String(row.check_in_at)), "p") : "—",
    },
    {
      key: "check_out_at",
      header: "Check out",
      render: (row) =>
        row.check_out_at ? format(new Date(String(row.check_out_at)), "p") : "—",
    },
    {
      key: "work_hours",
      header: "Work hours",
      render: (row) => formatWorkHours(Number(row.work_hours ?? 0)),
    },
  ];

  return (
    <div className="space-y-4">
      <section
        aria-label="Attendance summary"
        className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5"
      >
        <AttendanceSummaryCard
          label="Present days"
          value={summary.presentDays}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <AttendanceSummaryCard
          label="Absent days"
          value={absentDays}
          accent="text-rose-600 dark:text-rose-400"
        />
        <AttendanceSummaryCard
          label="Late arrivals"
          value={lateDays}
          accent="text-amber-600 dark:text-amber-400"
        />
        <AttendanceSummaryCard
          label="Half days"
          value={halfDays}
          accent="text-violet-600 dark:text-violet-400"
        />
        <AttendanceSummaryCard
          label="Total hours"
          value={formatWorkHours(summary.totalWorkHours)}
          accent="text-sky-600 dark:text-sky-400"
        />
      </section>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Attendance history</h3>
        {records.length ? (
          <DataTable columns={columns} data={records} />
        ) : (
          <EmptyState
            title="No attendance records"
            description="This team member has no attendance entries yet."
          />
        )}
      </div>
    </div>
  );
}

function ProfileInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-4 py-3 last:border-b-0">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

function TeamMemberProfileLayout({ detail }: { detail: TeamMemberDetailBundle }) {
  const employee = detail.employee;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">
          {employee.firstName} {employee.lastName}
        </h2>
        <EmploymentStatusBadge status={employee.employmentStatus} />
      </div>

      <div className="grid gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,22rem)]">
        <h3 className="text-base font-semibold lg:col-start-1">Employee Information</h3>
        <dl className="overflow-hidden rounded-xl border bg-card lg:col-start-1 lg:row-start-2">
          <ProfileInfoRow label="Employee ID" value={employee.employeeCode} />
          <ProfileInfoRow label="Email" value={employee.email} />
          <ProfileInfoRow label="Department" value={employee.departmentName ?? "—"} />
          <ProfileInfoRow label="Designation" value={employee.designationTitle ?? "—"} />
          <ProfileInfoRow label="Employment type" value={employee.employmentTypeName ?? "—"} />
          <ProfileInfoRow label="Manager" value={employee.reportingManagerName ?? "—"} />
          <ProfileInfoRow
            label="Joining date"
            value={
              employee.dateOfJoining
                ? format(new Date(employee.dateOfJoining), "d MMM yyyy")
                : "—"
            }
          />
          <ProfileInfoRow label="Phone" value={employee.phone ?? "—"} />
          <ProfileInfoRow label="Personal email" value={employee.profile?.personalEmail ?? "—"} />
          <ProfileInfoRow
            label="Attendance summary"
            value={`${detail.attendanceSummary.presentDays} present day(s) · ${detail.attendanceSummary.totalWorkHours.toFixed(1)} total hours`}
          />
        </dl>

        <aside className="flex flex-col items-center overflow-visible lg:col-start-2 lg:row-start-2">
          <EmployeeIdCard
            employeeId={employee.id}
            firstName={employee.firstName}
            lastName={employee.lastName}
            employeeCode={employee.employeeCode}
            designation={employee.designationTitle}
            departmentName={employee.departmentName}
            employmentTypeName={employee.employmentTypeName ?? "—"}
            accountStatus={employee.accountStatus}
            imageUrl={detail.profileImageUrl}
            profilePath={MANAGER_ROUTES.teamMember(employee)}
            canEdit={false}
          />
        </aside>
      </div>
    </div>
  );
}

function OverviewTab({ detail }: { detail: TeamMemberDetailBundle }) {
  const employee = detail.employee;
  const rows = [
    ["Employee ID", employee.employeeCode],
    ["Department", employee.departmentName ?? "—"],
    ["Designation", employee.designationTitle ?? "—"],
    ["Employment type", employee.employmentTypeName ?? "—"],
    ["Branch", employee.branchName ?? "—"],
    ["Manager", employee.reportingManagerName ?? "—"],
    ["Joining date", employee.dateOfJoining ? format(new Date(employee.dateOfJoining), "d MMM yyyy") : "—"],
    ["Phone", employee.phone ?? "—"],
    ["Personal email", employee.profile?.personalEmail ?? "—"],
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Attendance summary</p>
        <p className="mt-1 text-sm">
          {detail.attendanceSummary.presentDays} present day(s) ·{" "}
          {detail.attendanceSummary.totalWorkHours.toFixed(1)} total hours
        </p>
      </div>
    </div>
  );
}

function AttendanceTab({ detail }: { detail: TeamMemberDetailBundle }) {
  const columns: DataTableColumn<Record<string, unknown>>[] = [
    {
      key: "attendance_date",
      header: "Date",
      render: (row) =>
        row.attendance_date
          ? format(new Date(String(row.attendance_date)), "d MMM yyyy")
          : "—",
    },
    {
      key: "attendance_status",
      header: "Status",
      render: (row) =>
        row.attendance_status ? (
          <AttendanceStatusBadge status={row.attendance_status as never} />
        ) : (
          "—"
        ),
    },
    {
      key: "check_in_at",
      header: "Check in",
      render: (row) =>
        row.check_in_at ? format(new Date(String(row.check_in_at)), "p") : "—",
    },
    {
      key: "check_out_at",
      header: "Check out",
      render: (row) =>
        row.check_out_at ? format(new Date(String(row.check_out_at)), "p") : "—",
    },
  ];

  return detail.attendance.length ? (
    <DataTable columns={columns} data={detail.attendance} />
  ) : (
    <EmptyState title="No attendance records" description="Attendance history will appear here." />
  );
}

function LeaveTab({ detail }: { detail: TeamMemberDetailBundle }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-medium">Leave balances</h3>
        {detail.leaveBalances.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {detail.leaveBalances.map((balance) => (
              <div key={balance.id} className="rounded-lg border p-3">
                <p className="font-medium">{balance.leaveTypeName}</p>
                <p className="text-sm text-muted-foreground">
                  {balance.balanceDays} day(s) remaining · {balance.usedDays} used
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No leave balances" description="Leave balances are not available." />
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">Leave history</h3>
        {detail.leaveRequests.length ? (
          <div className="space-y-2">
            {detail.leaveRequests.map((leave) => (
              <div key={leave.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{leave.leaveTypeName}</p>
                  <LeaveStatusBadge status={leave.leaveStatus as LeaveStatus} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(leave.startDate), "d MMM yyyy")} –{" "}
                  {format(new Date(leave.endDate), "d MMM yyyy")} · {leave.totalDays} day(s)
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No leave requests" description="Leave history will appear here." />
        )}
      </div>
    </div>
  );
}

function PerformanceTab({ detail }: { detail: TeamMemberDetailBundle }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-medium">Reviews</h3>
        {detail.reviews.length ? (
          <div className="space-y-2">
            {detail.reviews.map((review) => (
              <div key={review.id} className="rounded-lg border p-3">
                <p className="font-medium">{review.cycleName ?? "Review"}</p>
                <p className="text-sm text-muted-foreground">
                  {review.reviewStage.replaceAll("_", " ")} · {review.reviewStatus.replaceAll("_", " ")}
                  {review.overallRating ? ` · Rating ${review.overallRating}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No performance reviews." description="" />
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">Feedback</h3>
        {detail.feedback.length ? (
          <div className="space-y-2">
            {detail.feedback.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <div className="mb-1 flex items-center gap-2">
                  <FeedbackTypeBadge type={item.feedbackType as never} />
                  <span className="text-xs text-muted-foreground">
                    {item.fromEmployeeName ?? "Unknown"} · {format(new Date(item.createdAt), "d MMM yyyy")}
                  </span>
                </div>
                <p className="text-sm">{item.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No feedback records." description="" />
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">1:1 meetings</h3>
        {detail.oneOnOnes.length ? (
          <div className="space-y-2">
            {detail.oneOnOnes.map((meeting) => (
              <div key={meeting.id} className="rounded-lg border p-3">
                <p className="font-medium">{format(new Date(meeting.scheduledAt), "d MMM yyyy, p")}</p>
                <p className="text-sm text-muted-foreground">
                  {meeting.meetingStatus.replaceAll("_", " ")}
                  {meeting.agenda ? ` · ${meeting.agenda}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No 1:1 meetings scheduled." description="" />
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">Promotion recommendations</h3>
        {detail.promotions.length ? (
          <div className="space-y-2">
            {detail.promotions.map((promotion) => (
              <div key={promotion.id} className="rounded-lg border p-3">
                <p className="font-medium">{promotion.recommendedDesignation ?? "Promotion"}</p>
                <p className="text-sm text-muted-foreground">
                  {promotion.promotionStatus.replaceAll("_", " ")} ·{" "}
                  {format(new Date(promotion.createdAt), "d MMM yyyy")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No promotion recommendations." description="" />
        )}
      </div>
    </div>
  );
}

function DocumentsTab({ detail }: { detail: TeamMemberDetailBundle }) {
  const documents = detail.employee.documents ?? [];
  return documents.length ? (
    <div className="space-y-2">
      {documents.map((document) => (
        <div key={document.id} className="rounded-lg border p-3">
          <p className="font-medium">{document.title}</p>
          <p className="text-sm text-muted-foreground">
            {document.documentTypeName ?? "Document"} · {document.documentStatus}
          </p>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState title="No documents" description="Employee documents will appear here." />
  );
}

function AssetsTab({ detail }: { detail: TeamMemberDetailBundle }) {
  return detail.assets.length ? (
    <div className="space-y-2">
      {detail.assets.map((asset) => (
        <div key={asset.id} className="rounded-lg border p-3">
          <p className="font-medium">{asset.assetName}</p>
          <p className="text-sm text-muted-foreground">
            {asset.assetCode}
            {asset.assignmentStatus
              ? ` · ${ASSIGNMENT_STATUS_LABELS[asset.assignmentStatus] ?? asset.assignmentStatus}`
              : ""}
          </p>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState title="No assets assigned" description="Assigned assets will appear here." />
  );
}

function ActionPanel({
  mode,
  employeeId,
  managerEmployeeId,
  teamMemberOptions,
  designationOptions,
  onClose,
  onSuccess,
}: {
  mode: "feedback" | "oneOnOne" | "promotion" | "concern";
  employeeId: string;
  managerEmployeeId: string;
  teamMemberOptions: LookupOption[];
  designationOptions: LookupOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  if (mode === "oneOnOne") {
    return (
      <InlineActionSheet title="Schedule 1:1" onClose={onClose}>
        <OneOnOneActionForm
          employeeId={employeeId}
          managerEmployeeId={managerEmployeeId}
          teamMemberOptions={teamMemberOptions}
          onSuccess={onSuccess}
        />
      </InlineActionSheet>
    );
  }

  if (mode === "promotion") {
    return (
      <InlineActionSheet title="Recommend promotion" onClose={onClose}>
        <PromotionActionForm
          employeeId={employeeId}
          designationOptions={designationOptions}
          onSuccess={onSuccess}
        />
      </InlineActionSheet>
    );
  }

  return (
    <InlineActionSheet
      title={mode === "concern" ? "Raise concern" : "Add feedback"}
      onClose={onClose}
    >
      <FeedbackActionForm
        employeeId={employeeId}
        feedbackType={mode === "concern" ? "warning" : "appreciation"}
        onSuccess={onSuccess}
      />
    </InlineActionSheet>
  );
}

function InlineActionSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 border-t bg-background p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      {children}
    </div>
  );
}

function FeedbackActionForm({
  employeeId,
  feedbackType,
  onSuccess,
}: {
  employeeId: string;
  feedbackType: z.input<typeof feedbackFormSchema>["feedbackType"];
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof feedbackFormSchema>>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      toEmployeeId: employeeId,
      feedbackType,
      visibility: "private",
      message: "",
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await createTeamFeedbackAction(values);
          if (!result.success) toast.error(result.message);
          else {
            toast.success("Feedback submitted");
            onSuccess();
          }
        });
      })}
    >
      <Field label="Feedback type">
        <LabeledSelect
          items={toSelectItems(FEEDBACK_TYPE_LABELS)}
          value={form.watch("feedbackType")}
          onValueChange={(value) =>
            form.setValue("feedbackType", value as typeof feedbackType, { shouldValidate: true })
          }
          disabled={isPending}
        />
      </Field>
      <Field label="Visibility">
        <LabeledSelect
          items={toSelectItems(FEEDBACK_VISIBILITY_LABELS)}
          value={form.watch("visibility")}
          onValueChange={(value) =>
            form.setValue("visibility", value as "public" | "private", { shouldValidate: true })
          }
          disabled={isPending}
        />
      </Field>
      <Field label="Message">
        <Input disabled={isPending} {...form.register("message")} placeholder="Write your feedback..." />
      </Field>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Submit
      </Button>
    </form>
  );
}

function OneOnOneActionForm({
  employeeId,
  managerEmployeeId,
  teamMemberOptions,
  onSuccess,
}: {
  employeeId: string;
  managerEmployeeId: string;
  teamMemberOptions: LookupOption[];
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof oneOnOneFormSchema>>({
    resolver: zodResolver(oneOnOneFormSchema),
    defaultValues: {
      employeeId,
      managerEmployeeId,
      scheduledAt: "",
      meetingStatus: "scheduled",
      actionItems: [],
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await createTeamOneOnOneAction(values);
          if (!result.success) toast.error(result.message);
          else {
            toast.success("1:1 scheduled");
            onSuccess();
          }
        });
      })}
    >
      <Field label="Scheduled at">
        <Input type="datetime-local" disabled={isPending} {...form.register("scheduledAt")} />
      </Field>
      <Field label="Agenda">
        <Input disabled={isPending} {...form.register("agenda")} placeholder="Meeting agenda" />
      </Field>
      <Field label="Notes">
        <Input disabled={isPending} {...form.register("notes")} placeholder="Optional notes" />
      </Field>
      <input type="hidden" {...form.register("employeeId")} value={employeeId} />
      <input type="hidden" {...form.register("managerEmployeeId")} value={managerEmployeeId} />
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Schedule
      </Button>
    </form>
  );
}

function PromotionActionForm({
  employeeId,
  designationOptions,
  onSuccess,
}: {
  employeeId: string;
  designationOptions: LookupOption[];
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof promotionFormSchema>>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: { employeeId },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await createTeamPromotionAction(values);
          if (!result.success) toast.error(result.message);
          else {
            toast.success("Promotion recommended");
            onSuccess();
          }
        });
      })}
    >
      <Field label="Recommended designation">
        <LabeledSelect
          items={designationOptions.map((item) => ({ value: item.id, label: item.label }))}
          value={form.watch("recommendedDesignationId") ?? ""}
          onValueChange={(value) => form.setValue("recommendedDesignationId", value || null)}
          disabled={isPending}
        />
      </Field>
      <Field label="Reason">
        <Input disabled={isPending} {...form.register("reason")} placeholder="Promotion justification" />
      </Field>
      <input type="hidden" {...form.register("employeeId")} value={employeeId} />
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Recommend
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
