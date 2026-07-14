import {
  addDays,
  format,
  isWithinInterval,
  parseISO,
} from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { getManagerTeamContext } from "@/lib/manager/services/team-hierarchy";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import type { UserProfile } from "@/types/auth";
import type {
  ManagerActionItem,
  ManagerActivityItem,
  ManagerDashboardData,
  ManagerDashboardKpis,
} from "@/types/manager-dashboard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const ACTIVE_EMPLOYMENT = ["active", "probation", "on_leave"] as const;
const REVIEW_PENDING_STATUSES = ["pending", "in_progress", "submitted"] as const;
const ACTION_LIMIT = 5;
const ACTIVITY_LIMIT = 8;

function nextBirthdayWithinDays(
  dateOfBirth: string | null | undefined,
  from: Date,
  days: number,
): Date | null {
  if (!dateOfBirth || dateOfBirth.length < 10) return null;
  const monthDay = dateOfBirth.slice(5, 10);
  const [month, day] = monthDay.split("-").map(Number);
  if (!month || !day) return null;

  const end = addDays(from, days);
  let candidate = new Date(from.getFullYear(), month - 1, day);
  const todayStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  if (candidate < todayStart) {
    candidate = new Date(from.getFullYear() + 1, month - 1, day);
  }

  if (isWithinInterval(candidate, { start: todayStart, end })) {
    return candidate;
  }

  return null;
}

function emptyDashboard(teamMembers: ManagerDashboardData["teamMembers"]): ManagerDashboardData {
  return {
    generatedAt: new Date().toISOString(),
    teamMembers,
    kpis: {
      teamSize: teamMembers.length,
      presentToday: 0,
      onLeaveToday: 0,
      lateToday: 0,
      pendingLeaveApprovals: 0,
      pendingPerformanceReviews: 0,
      openRecruitmentRequests: 0,
      probationEndingSoon: 0,
    },
    actionItems: [],
    activities: [],
  };
}

export async function getManagerDashboardData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<ManagerDashboardData> {
  const managerId = profile.employee.id;
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const todayDate = parseISO(today);
  const probationHorizon = format(addDays(todayDate, 30), "yyyy-MM-dd");

  const { teamIds, teamMembers } = await getManagerTeamContext(
    supabase,
    organizationId,
    managerId,
  );

  if (teamIds.length === 0) {
    return emptyDashboard(teamMembers);
  }

  const managerDepartmentPromise = supabase
    .schema("hrms")
    .from("employees")
    .select("department_id")
    .eq("id", managerId)
    .maybeSingle();

  const [
    managerRow,
    attendanceResult,
    leaveApprovalsResult,
    correctionsResult,
    reviewsResult,
    interviewsResult,
    probationEmployeesResult,
    salaryStructuresResult,
    profilesResult,
    recentLeavesResult,
    recentCorrectionsResult,
    recentFeedbackResult,
    recentJoinersResult,
    recentPromotionsResult,
    completedInterviewsResult,
  ] = await Promise.all([
    managerDepartmentPromise,
    supabase
      .schema("hrms")
      .from("attendance")
      .select("employee_id, attendance_status")
      .eq("organization_id", organizationId)
      .eq("attendance_date", today)
      .in("employee_id", teamIds)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("leave_approvals")
      .select(
        `
          id,
          approval_status,
          leave_requests!inner (
            id,
            employee_id,
            start_date,
            end_date,
            total_days,
            leave_status,
            created_at,
            employees:employee_id!inner (
              first_name,
              last_name,
              employee_code
            ),
            leave_types:leave_type_id (name)
          )
        `,
      )
      .eq("approver_employee_id", managerId)
      .eq("approval_status", "pending")
      .eq("leave_requests.leave_status", "pending")
      .in("leave_requests.employee_id", teamIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .schema("hrms")
      .from("attendance_corrections")
      .select(
        `
          id,
          employee_id,
          correction_status,
          created_at,
          attendance:attendance_id (attendance_date),
          employees:employee_id!inner (first_name, last_name, employee_code)
        `,
      )
      .in("employee_id", teamIds)
      .eq("correction_status", "pending")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    fromHrms(supabase, "performance_reviews")
      .select(
        `
          id,
          employee_id,
          review_status,
          review_stage,
          created_at,
          employees:employee_id!inner (first_name, last_name, employee_code),
          performance_review_cycles:cycle_id (name)
        `,
      )
      .eq("organization_id", organizationId)
      .eq("reviewer_employee_id", managerId)
      .in("employee_id", teamIds)
      .in("review_status", [...REVIEW_PENDING_STATUSES])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    fromHrms(supabase, "recruitment_interviews")
      .select(
        `
          id,
          round_name,
          interview_date,
          interview_status,
          created_at,
          candidates:candidate_id (first_name, last_name),
          job:job_opening_id (title)
        `,
      )
      .eq("organization_id", organizationId)
      .eq("interviewer_employee_id", managerId)
      .eq("interview_status", "scheduled")
      .gte("interview_date", today)
      .is("deleted_at", null)
      .order("interview_date", { ascending: true })
      .limit(20),
    supabase
      .schema("hrms")
      .from("employees")
      .select("id, first_name, last_name, employee_code, employment_status")
      .eq("organization_id", organizationId)
      .in("id", teamIds)
      .in("employment_status", [...ACTIVE_EMPLOYMENT])
      .is("deleted_at", null),
    fromHrms(supabase, "salary_structures")
      .select("employee_id, components")
      .in("employee_id", teamIds)
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("employee_profiles")
      .select("employee_id, date_of_birth")
      .in("employee_id", teamIds)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select(
        `
          id,
          employee_id,
          start_date,
          end_date,
          total_days,
          leave_status,
          created_at,
          employees:employee_id!inner (first_name, last_name),
          leave_types:leave_type_id (name)
        `,
      )
      .in("employee_id", teamIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .schema("hrms")
      .from("attendance_corrections")
      .select(
        `
          id,
          employee_id,
          correction_status,
          reviewed_at,
          updated_at,
          created_at,
          employees:employee_id!inner (first_name, last_name),
          attendance:attendance_id (attendance_date)
        `,
      )
      .in("employee_id", teamIds)
      .in("correction_status", ["approved", "rejected"])
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(12),
    fromHrms(supabase, "performance_feedback")
      .select(
        `
          id,
          feedback_type,
          to_employee_id,
          created_at,
          to_employee:to_employee_id (first_name, last_name),
          from_employee:from_employee_id (first_name, last_name)
        `,
      )
      .eq("organization_id", organizationId)
      .in("to_employee_id", teamIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .schema("hrms")
      .from("employees")
      .select("id, first_name, last_name, employee_code, date_of_joining, created_at")
      .eq("organization_id", organizationId)
      .in("id", teamIds)
      .gte("date_of_joining", format(addDays(todayDate, -60), "yyyy-MM-dd"))
      .is("deleted_at", null)
      .order("date_of_joining", { ascending: false })
      .limit(12),
    fromHrms(supabase, "performance_promotions")
      .select(
        `
          id,
          promotion_status,
          created_at,
          employees:employee_id!inner (first_name, last_name),
          recommended_designation:recommended_designation_id (title)
        `,
      )
      .eq("organization_id", organizationId)
      .in("employee_id", teamIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(12),
    fromHrms(supabase, "recruitment_interviews")
      .select(
        `
          id,
          round_name,
          interview_status,
          interview_date,
          updated_at,
          created_at,
          candidates:candidate_id (first_name, last_name)
        `,
      )
      .eq("organization_id", organizationId)
      .eq("interviewer_employee_id", managerId)
      .eq("interview_status", "completed")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);

  const openJobsResult = managerRow.data?.department_id
    ? await fromHrms(supabase, "recruitment_job_openings")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("department_id", managerRow.data.department_id)
        .eq("job_status", "open")
        .is("deleted_at", null)
    : { count: 0, error: null };

  if (managerRow.error) throw new Error(managerRow.error.message);
  if (attendanceResult.error) throw new Error(attendanceResult.error.message);
  if (leaveApprovalsResult.error) throw new Error(leaveApprovalsResult.error.message);
  if (correctionsResult.error) throw new Error(correctionsResult.error.message);
  if (reviewsResult.error) throw new Error(reviewsResult.error.message);
  if (interviewsResult.error) throw new Error(interviewsResult.error.message);
  if (probationEmployeesResult.error) throw new Error(probationEmployeesResult.error.message);
  if (salaryStructuresResult.error) throw new Error(salaryStructuresResult.error.message);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (openJobsResult.error) throw new Error(openJobsResult.error.message);
  if (recentLeavesResult.error) throw new Error(recentLeavesResult.error.message);
  if (recentCorrectionsResult.error) throw new Error(recentCorrectionsResult.error.message);
  if (recentFeedbackResult.error) throw new Error(recentFeedbackResult.error.message);
  if (recentJoinersResult.error) throw new Error(recentJoinersResult.error.message);
  if (recentPromotionsResult.error) throw new Error(recentPromotionsResult.error.message);
  if (completedInterviewsResult.error) throw new Error(completedInterviewsResult.error.message);

  const attendanceCounts = {
    presentToday: 0,
    onLeaveToday: 0,
    lateToday: 0,
  };

  for (const row of attendanceResult.data ?? []) {
    switch (row.attendance_status) {
      case "present":
      case "half_day":
        attendanceCounts.presentToday += 1;
        break;
      case "late":
        attendanceCounts.lateToday += 1;
        break;
      case "on_leave":
        attendanceCounts.onLeaveToday += 1;
        break;
      default:
        break;
    }
  }

  const probationEndByEmployee = new Map<string, string>();
  for (const row of salaryStructuresResult.data ?? []) {
    const components = row.components as { probation_end_date?: string } | null;
    const endDate = components?.probation_end_date;
    if (endDate && row.employee_id) {
      probationEndByEmployee.set(row.employee_id, endDate);
    }
  }

  const profileDobByEmployee = new Map<string, string>();
  for (const row of profilesResult.data ?? []) {
    if (row.employee_id && row.date_of_birth) {
      profileDobByEmployee.set(row.employee_id, row.date_of_birth);
    }
  }

  let probationEndingSoon = 0;
  const probationActionItems: ManagerActionItem[] = [];
  const birthdayActionItems: ManagerActionItem[] = [];

  for (const employee of probationEmployeesResult.data ?? []) {
    const probationEnd = probationEndByEmployee.get(employee.id);

    const endingSoon =
      (probationEnd && probationEnd >= today && probationEnd <= probationHorizon) ||
      (employee.employment_status === "probation" && !probationEnd);

    if (endingSoon) {
      probationEndingSoon += 1;
      if (probationActionItems.length < ACTION_LIMIT) {
        probationActionItems.push({
          id: `probation-${employee.id}`,
          kind: "probation",
          title: formatEmployeeName(employee.first_name, employee.last_name),
          subtitle: employee.employee_code,
          meta: probationEnd
            ? `Probation ends ${format(parseISO(probationEnd), "d MMM yyyy")}`
            : "Probation in progress",
          urgency: "medium",
          employeeId: employee.id,
          href: MANAGER_ROUTES.performanceDetail(employee.id),
        });
      }
    }

    const dateOfBirth = profileDobByEmployee.get(employee.id);
    const birthday = nextBirthdayWithinDays(dateOfBirth, todayDate, 7);
    if (birthday && birthdayActionItems.length < ACTION_LIMIT) {
      birthdayActionItems.push({
        id: `birthday-${employee.id}`,
        kind: "birthday",
        title: formatEmployeeName(employee.first_name, employee.last_name),
        subtitle: employee.employee_code,
        meta: format(birthday, "EEE, d MMM"),
        urgency: "low",
        employeeId: employee.id,
        href: `${MANAGER_ROUTES.team}?search=${encodeURIComponent(formatEmployeeName(employee.first_name, employee.last_name))}`,
      });
    }
  }

  birthdayActionItems.sort((left, right) => left.meta.localeCompare(right.meta));

  const leaveActionItems: ManagerActionItem[] = (leaveApprovalsResult.data ?? [])
    .slice(0, ACTION_LIMIT)
    .map((row: LooseRow) => {
      const leave = unwrapRelation(row.leave_requests);
      const employee = unwrapRelation(leave?.employees);
      const leaveType = unwrapRelation(leave?.leave_types);
      return {
        id: `leave-${leave?.id ?? row.id}`,
        kind: "leave_approval" as const,
        title: employee
          ? formatEmployeeName(employee.first_name, employee.last_name)
          : "Team member",
        subtitle: leaveType?.name ?? "Leave request",
        meta: leave
          ? `${format(parseISO(leave.start_date), "d MMM")} – ${format(parseISO(leave.end_date), "d MMM")} · ${leave.total_days} day(s)`
          : "Awaiting approval",
        urgency: "high" as const,
        employeeId: leave?.employee_id as string | undefined,
        href: leave?.id ? MANAGER_ROUTES.leaveDetail(String(leave.id)) : MANAGER_ROUTES.leave,
      };
    });

  const correctionActionItems: ManagerActionItem[] = (correctionsResult.data ?? [])
    .slice(0, ACTION_LIMIT)
    .map((row: LooseRow) => {
      const employee = unwrapRelation(row.employees);
      const attendance = unwrapRelation(row.attendance);
      return {
        id: `correction-${row.id}`,
        kind: "attendance_correction" as const,
        title: employee
          ? formatEmployeeName(employee.first_name, employee.last_name)
          : "Team member",
        subtitle: "Attendance regularization",
        meta: attendance?.attendance_date
          ? format(parseISO(attendance.attendance_date), "d MMM yyyy")
          : "Pending review",
        urgency: "high" as const,
        employeeId: row.employee_id as string | undefined,
        href: row.employee_id
          ? `${MANAGER_ROUTES.attendance}?employeeId=${row.employee_id}`
          : MANAGER_ROUTES.attendance,
      };
    });

  const reviewActionItems: ManagerActionItem[] = (reviewsResult.data ?? [])
    .slice(0, ACTION_LIMIT)
    .map((row: LooseRow) => {
      const employee = unwrapRelation(row.employees);
      const cycle = unwrapRelation(row.performance_review_cycles);
      return {
        id: `review-${row.id}`,
        kind: "performance_review" as const,
        title: employee
          ? formatEmployeeName(employee.first_name, employee.last_name)
          : "Team member",
        subtitle: cycle?.name ?? "Performance review",
        meta: String(row.review_status).replaceAll("_", " "),
        urgency: "medium" as const,
        employeeId: row.employee_id as string | undefined,
        href: row.employee_id
          ? MANAGER_ROUTES.performanceDetail(String(row.employee_id))
          : MANAGER_ROUTES.performance,
      };
    });

  const interviewActionItems: ManagerActionItem[] = (interviewsResult.data ?? [])
    .slice(0, ACTION_LIMIT)
    .map((row: LooseRow) => {
      const candidate = unwrapRelation(row.candidates);
      const job = unwrapRelation(row.job);
      return {
        id: `interview-${row.id}`,
        kind: "interview" as const,
        title: candidate
          ? formatEmployeeName(candidate.first_name, candidate.last_name)
          : "Candidate interview",
        subtitle: job?.title ?? row.round_name ?? "Interview",
        meta: row.interview_date
          ? format(parseISO(row.interview_date), "d MMM yyyy")
          : "Scheduled",
        urgency: "medium" as const,
        href: MANAGER_ROUTES.recruitment,
      };
    });

  const actionItems: ManagerActionItem[] = [
    ...leaveActionItems,
    ...correctionActionItems,
    ...reviewActionItems,
    ...interviewActionItems,
    ...probationActionItems,
    ...birthdayActionItems,
  ];

  const kpis: ManagerDashboardKpis = {
    teamSize: teamIds.length,
    presentToday: attendanceCounts.presentToday,
    onLeaveToday: attendanceCounts.onLeaveToday,
    lateToday: attendanceCounts.lateToday,
    pendingLeaveApprovals: (leaveApprovalsResult.data ?? []).length,
    pendingPerformanceReviews: (reviewsResult.data ?? []).length,
    openRecruitmentRequests: openJobsResult.count ?? 0,
    probationEndingSoon,
  };

  const activities: ManagerActivityItem[] = [
    ...(recentLeavesResult.data ?? []).map((row: LooseRow) => {
      const employee = unwrapRelation(row.employees);
      const leaveType = unwrapRelation(row.leave_types);
      return {
        id: `activity-leave-${row.id}`,
        kind: "leave_applied" as const,
        title: "Leave applied",
        description: `${employee ? formatEmployeeName(employee.first_name, employee.last_name) : "Team member"} · ${leaveType?.name ?? "Leave"} · ${row.total_days} day(s)`,
        occurredAt: row.created_at,
        employeeId: row.employee_id as string | undefined,
      };
    }),
    ...(recentCorrectionsResult.data ?? []).map((row: LooseRow) => {
      const employee = unwrapRelation(row.employees);
      const attendance = unwrapRelation(row.attendance);
      return {
        id: `activity-correction-${row.id}`,
        kind: "attendance_regularized" as const,
        title: "Attendance regularized",
        description: `${employee ? formatEmployeeName(employee.first_name, employee.last_name) : "Team member"} · ${attendance?.attendance_date ?? "Date pending"} · ${row.correction_status}`,
        occurredAt: row.reviewed_at ?? row.updated_at ?? row.created_at,
        employeeId: row.employee_id as string | undefined,
      };
    }),
    ...(recentFeedbackResult.data ?? []).map((row: LooseRow) => {
      const recipient = unwrapRelation(row.to_employee);
      const author = unwrapRelation(row.from_employee);
      return {
        id: `activity-feedback-${row.id}`,
        kind: "feedback_submitted" as const,
        title: "Feedback submitted",
        description: `${author ? formatEmployeeName(author.first_name, author.last_name) : "Someone"} → ${recipient ? formatEmployeeName(recipient.first_name, recipient.last_name) : "Team member"} · ${row.feedback_type}`,
        occurredAt: row.created_at,
        employeeId: row.to_employee_id as string | undefined,
      };
    }),
    ...(recentJoinersResult.data ?? []).map((row: LooseRow) => ({
      id: `activity-join-${row.id}`,
      kind: "employee_joined" as const,
      title: "New employee joined",
      description: `${formatEmployeeName(row.first_name, row.last_name)} · ${row.employee_code}${row.date_of_joining ? ` · Joined ${format(parseISO(row.date_of_joining), "d MMM yyyy")}` : ""}`,
      occurredAt: row.created_at,
      employeeId: row.id as string,
    })),
    ...(recentPromotionsResult.data ?? []).map((row: LooseRow) => {
      const employee = unwrapRelation(row.employees);
      const designation = unwrapRelation(row.recommended_designation);
      return {
        id: `activity-promotion-${row.id}`,
        kind: "promotion_recommendation" as const,
        title: "Promotion recommendation",
        description: `${employee ? formatEmployeeName(employee.first_name, employee.last_name) : "Team member"} · ${designation?.title ?? "New role"} · ${row.promotion_status}`,
        occurredAt: row.created_at,
        employeeId: row.employee_id as string | undefined,
      };
    }),
    ...(completedInterviewsResult.data ?? []).map((row: LooseRow) => {
      const candidate = unwrapRelation(row.candidates);
      return {
        id: `activity-interview-${row.id}`,
        kind: "interview_completed" as const,
        title: "Interview completed",
        description: `${candidate ? formatEmployeeName(candidate.first_name, candidate.last_name) : "Candidate"} · ${row.round_name ?? "Interview round"}`,
        occurredAt: row.updated_at ?? row.created_at,
      };
    }),
  ]
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    )
    .slice(0, ACTIVITY_LIMIT);

  return {
    generatedAt: new Date().toISOString(),
    teamMembers,
    kpis,
    actionItems,
    activities,
  };
}

export async function getManagerDashboardActivities(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId?: string,
): Promise<{ generatedAt: string; activities: ManagerActivityItem[] }> {
  const data = await getManagerDashboardData(supabase, profile);
  const activities = employeeId
    ? data.activities.filter(
        (item) => !item.employeeId || item.employeeId === employeeId,
      )
    : data.activities;

  return {
    generatedAt: new Date().toISOString(),
    activities,
  };
}
