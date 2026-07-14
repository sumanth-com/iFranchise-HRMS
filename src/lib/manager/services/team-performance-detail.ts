import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/performance/services/performance-utils";
import {
  getReviewById,
} from "@/lib/performance/services/performance-mutations";
import { parseReviewCommentsPayload } from "@/lib/manager/services/performance-competency-utils";
import { getTeamPerformanceTrends } from "@/lib/manager/services/team-performance-queries";
import { assertTeamMember } from "@/lib/manager/services/team-queries";
import type { UserProfile } from "@/types/auth";
import type {
  FeedbackListItem,
  GoalListItem,
  OneOnOneListItem,
  PromotionListItem,
  ReviewStatus,
} from "@/types/performance";
import type { TeamEmployeePerformanceProfile } from "@/types/manager-performance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return unwrapRelation(value as T | T[] | null);
}

export async function getTeamEmployeePerformanceProfile(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  employeeId: string,
): Promise<TeamEmployeePerformanceProfile | null> {
  assertTeamMember(teamIds, employeeId);

  const organizationId = profile.employee.organizationId;

  const { data: employee, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        id,
        employee_code,
        first_name,
        last_name,
        email,
        date_of_joining,
        departments:department_id (name),
        designations:designation_id (title),
        managers:reporting_manager_id (first_name, last_name)
      `,
    )
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) return null;

  const department = unwrap(employee.departments);
  const designation = unwrap(employee.designations);
  const manager = unwrap(employee.managers);

  const [
    goalsResult,
    reviewsResult,
    feedbackResult,
    oneOnOneResult,
    promotionsResult,
    trends,
  ] = await Promise.all([
    fromHrms(supabase, "performance_goals")
      .select(
        `
          id,
          employee_id,
          cycle_id,
          title,
          description,
          category,
          goal_priority,
          weightage,
          current_progress,
          due_date,
          goal_status,
          attachment_path,
          created_at,
          employees:employee_id!inner(employee_code, first_name, last_name, departments:department_id(name)),
          performance_review_cycles:cycle_id(name),
          performance_goal_milestones(id, is_completed)
        `,
      )
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    fromHrms(supabase, "performance_reviews")
      .select(
        `
          id,
          overall_rating,
          review_status,
          submitted_at,
          approved_at,
          created_at,
          strengths,
          weaknesses,
          improvement_plan,
          comments,
          performance_review_cycles:cycle_id(name)
        `,
      )
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    fromHrms(supabase, "performance_feedback")
      .select(
        `
          id,
          message,
          feedback_type,
          visibility,
          created_at,
          from_employee:from_employee_id(first_name, last_name),
          to_employee:to_employee_id(first_name, last_name, id)
        `,
      )
      .eq("organization_id", organizationId)
      .eq("to_employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    fromHrms(supabase, "performance_one_on_ones")
      .select(
        `
          id,
          employee_id,
          scheduled_at,
          agenda,
          notes,
          follow_up_date,
          meeting_status,
          created_at,
          employee:employee_id(first_name, last_name),
          manager:manager_employee_id(first_name, last_name),
          performance_one_on_one_actions(id, is_completed)
        `,
      )
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("scheduled_at", { ascending: false })
      .limit(20),
    fromHrms(supabase, "performance_promotions")
      .select(
        `
          id,
          employee_id,
          promotion_status,
          reason,
          recommended_salary,
          created_at,
          employee:employee_id(first_name, last_name, employee_code, departments:department_id(name)),
          current_designation:current_designation_id(title),
          recommended_designation:recommended_designation_id(title)
        `,
      )
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    getTeamPerformanceTrends(supabase, profile, [employeeId]),
  ]);

  if (goalsResult.error) throw new Error(goalsResult.error.message);
  if (reviewsResult.error) throw new Error(reviewsResult.error.message);
  if (feedbackResult.error) throw new Error(feedbackResult.error.message);
  if (oneOnOneResult.error) throw new Error(oneOnOneResult.error.message);
  if (promotionsResult.error) throw new Error(promotionsResult.error.message);

  const goals: GoalListItem[] = ((goalsResult.data ?? []) as LooseRow[]).map((row) => {
    const emp = unwrap(row.employees);
    const dept = unwrap(emp?.departments ?? null);
    const cycle = unwrap(row.performance_review_cycles);
    const milestones = (row.performance_goal_milestones ?? []) as Array<{ is_completed: boolean }>;
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: emp ? formatEmployeeName(emp.first_name, emp.last_name) : "—",
      employeeCode: emp?.employee_code ?? "—",
      departmentName: dept?.name ?? null,
      cycleId: row.cycle_id,
      cycleName: cycle?.name ?? null,
      title: row.title,
      description: row.description,
      category: row.category,
      goalPriority: row.goal_priority,
      weightage: Number(row.weightage),
      currentProgress: Number(row.current_progress),
      dueDate: row.due_date,
      goalStatus: row.goal_status,
      attachmentPath: row.attachment_path,
      milestoneCount: milestones.length,
      completedMilestones: milestones.filter((item) => item.is_completed).length,
      createdAt: row.created_at,
    };
  });

  const reviews = (reviewsResult.data ?? []) as LooseRow[];
  const historicalRatings = reviews.map((review) => {
    const cycle = unwrap(review.performance_review_cycles);
    return {
      reviewId: review.id,
      cycleName: cycle?.name ?? null,
      rating: review.overall_rating !== null ? Number(review.overall_rating) : null,
      reviewStatus: review.review_status as ReviewStatus,
      submittedAt: review.submitted_at ?? review.approved_at ?? review.created_at,
    };
  });

  const latestApproved = reviews.find((review) => review.review_status === "approved");
  const latestReviewRow = reviews.find(
    (review) =>
      review.review_status === "draft" ||
      review.review_status === "pending" ||
      review.review_status === "in_progress",
  );

  const activeReview = latestReviewRow
    ? await getReviewById(supabase, organizationId, latestReviewRow.id)
    : null;

  const achievements = reviews
    .map((review) => review.strengths)
    .filter((value): value is string => Boolean(value?.trim()));

  const improvementAreas = reviews
    .map((review) => review.weaknesses ?? review.improvement_plan)
    .filter((value): value is string => Boolean(value?.trim()));

  const feedback: FeedbackListItem[] = ((feedbackResult.data ?? []) as LooseRow[]).map(
    (row) => {
      const fromEmployee = unwrap(row.from_employee);
      const toEmployee = unwrap(row.to_employee);
      return {
        id: row.id,
        fromEmployeeName: fromEmployee
          ? formatEmployeeName(fromEmployee.first_name, fromEmployee.last_name)
          : "—",
        toEmployeeName: toEmployee
          ? formatEmployeeName(toEmployee.first_name, toEmployee.last_name)
          : "—",
        toEmployeeId: toEmployee?.id ?? employeeId,
        feedbackType: row.feedback_type,
        visibility: row.visibility,
        message: row.message,
        createdAt: row.created_at,
      };
    },
  );

  const oneOnOnes: OneOnOneListItem[] = ((oneOnOneResult.data ?? []) as LooseRow[]).map(
    (row) => {
      const employeeRow = unwrap(row.employee);
      const managerRow = unwrap(row.manager);
      const actions = (row.performance_one_on_one_actions ?? []) as Array<{ is_completed: boolean }>;
      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeName: employeeRow
          ? formatEmployeeName(employeeRow.first_name, employeeRow.last_name)
          : "—",
        managerName: managerRow
          ? formatEmployeeName(managerRow.first_name, managerRow.last_name)
          : "—",
        scheduledAt: row.scheduled_at,
        agenda: row.agenda,
        notes: row.notes,
        followUpDate: row.follow_up_date,
        meetingStatus: row.meeting_status,
        actionItemCount: actions.length,
        completedActions: actions.filter((item) => item.is_completed).length,
        createdAt: row.created_at,
      };
    },
  );

  const promotions: PromotionListItem[] = ((promotionsResult.data ?? []) as LooseRow[]).map(
    (row) => {
      const employeeRow = unwrap(row.employee);
      const dept = unwrap(employeeRow?.departments ?? null);
      const currentDesignation = unwrap(row.current_designation);
      const recommendedDesignation = unwrap(row.recommended_designation);
      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeName: employeeRow
          ? formatEmployeeName(employeeRow.first_name, employeeRow.last_name)
          : "—",
        employeeCode: employeeRow?.employee_code ?? "—",
        departmentName: dept?.name ?? null,
        currentDesignation: currentDesignation?.title ?? null,
        recommendedDesignation: recommendedDesignation?.title ?? null,
        currentSalary: null,
        recommendedSalary:
          row.recommended_salary !== null ? Number(row.recommended_salary) : null,
        promotionStatus: row.promotion_status,
        recommendedByName: null,
        approverName: null,
        reason: row.reason,
        createdAt: row.created_at,
      };
    },
  );

  if (activeReview) {
    const parsedComments = parseReviewCommentsPayload(activeReview.comments);
    activeReview.comments = parsedComments.rawNotes;
  }

  return {
    employeeId: employee.id,
    employeeCode: employee.employee_code,
    employeeName: formatEmployeeName(employee.first_name, employee.last_name),
    employeeEmail: employee.email,
    departmentName: department?.name ?? null,
    designationTitle: designation?.title ?? null,
    managerName: manager ? formatEmployeeName(manager.first_name, manager.last_name) : null,
    dateOfJoining: employee.date_of_joining,
    currentRating: latestApproved?.overall_rating
      ? Number(latestApproved.overall_rating)
      : null,
    historicalRatings,
    goals,
    achievements,
    improvementAreas,
    feedback,
    oneOnOnes,
    promotions,
    activeReview,
    trends,
  };
}
