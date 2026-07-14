import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  getEmployeeAttendance,
  getEmployeeAttendanceSummary,
  getEmployeeById,
  getEmployeeLeaveBalances,
  getEmployeeLeaveRequests,
} from "@/lib/employees/services/employee-detail";
import { listEmployeeAssets } from "@/lib/assets/services/asset-queries";
import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import { createSignedStorageUrl } from "@/lib/employees/services/employee-mutations";
import { assertTeamMember } from "@/lib/manager/services/team-queries";
import { fromHrms, unwrapRelation } from "@/lib/reports/services/reports-utils";
import type { TeamMemberDetailBundle } from "@/types/manager-team";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return unwrapRelation(value as T | T[] | null);
}

export async function getTeamMemberDetailBundle(
  supabase: AuthSupabaseClient,
  organizationId: string,
  teamIds: string[],
  employeeId: string,
): Promise<TeamMemberDetailBundle | null> {
  assertTeamMember(teamIds, employeeId);

  const [
    employee,
    attendance,
    leaveRequests,
    leaveBalances,
    attendanceSummary,
    assets,
    reviewsResult,
    feedbackResult,
    oneOnOnesResult,
    promotionsResult,
  ] = await Promise.all([
    getEmployeeById(supabase, employeeId),
    getEmployeeAttendance(supabase, employeeId),
    getEmployeeLeaveRequests(supabase, employeeId),
    getEmployeeLeaveBalances(supabase, employeeId),
    getEmployeeAttendanceSummary(supabase, employeeId),
    listEmployeeAssets(supabase, organizationId, employeeId),
    fromHrms(supabase, "performance_reviews")
      .select(
        `
          id,
          review_status,
          review_stage,
          overall_rating,
          submitted_at,
          performance_review_cycles:cycle_id (name)
        `,
      )
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    fromHrms(supabase, "performance_feedback")
      .select(
        `
          id,
          feedback_type,
          message,
          created_at,
          from_employee:from_employee_id (first_name, last_name)
        `,
      )
      .eq("organization_id", organizationId)
      .eq("to_employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    fromHrms(supabase, "performance_one_on_ones")
      .select("id, scheduled_at, meeting_status, agenda")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("scheduled_at", { ascending: false })
      .limit(20),
    fromHrms(supabase, "performance_promotions")
      .select(
        `
          id,
          promotion_status,
          created_at,
          recommended_designation:recommended_designation_id (title)
        `,
      )
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!employee) return null;

  if (reviewsResult.error) throw new Error(reviewsResult.error.message);
  if (feedbackResult.error) throw new Error(feedbackResult.error.message);
  if (oneOnOnesResult.error) throw new Error(oneOnOnesResult.error.message);
  if (promotionsResult.error) throw new Error(promotionsResult.error.message);

  let profileImageUrl: string | null = null;
  if (employee.profile?.profileImageStoragePath) {
    profileImageUrl = await createSignedStorageUrl(
      supabase,
      EMPLOYEE_STORAGE_BUCKETS.profileImages,
      employee.profile.profileImageStoragePath,
    );
  }

  return {
    employee,
    profileImageUrl,
    attendance,
    leaveRequests,
    leaveBalances,
    attendanceSummary,
    assets,
    reviews: (reviewsResult.data ?? []).map((row: LooseRow) => {
      const cycle = unwrap(row.performance_review_cycles);
      return {
        id: row.id,
        cycleName: cycle?.name ?? null,
        reviewStatus: row.review_status,
        reviewStage: row.review_stage,
        overallRating: row.overall_rating,
        submittedAt: row.submitted_at,
      };
    }),
    feedback: (feedbackResult.data ?? []).map((row: LooseRow) => {
      const author = unwrap(row.from_employee);
      return {
        id: row.id,
        feedbackType: row.feedback_type,
        message: row.message,
        fromEmployeeName: author ? `${author.first_name} ${author.last_name}` : null,
        createdAt: row.created_at,
      };
    }),
    oneOnOnes: (oneOnOnesResult.data ?? []).map((row: LooseRow) => ({
      id: row.id,
      scheduledAt: row.scheduled_at,
      meetingStatus: row.meeting_status,
      agenda: row.agenda,
    })),
    promotions: (promotionsResult.data ?? []).map((row: LooseRow) => {
      const designation = unwrap(row.recommended_designation);
      return {
        id: row.id,
        promotionStatus: row.promotion_status,
        recommendedDesignation: designation?.title ?? null,
        createdAt: row.created_at,
      };
    }),
  };
}

export async function listTeamPendingLeaveApprovals(
  supabase: AuthSupabaseClient,
  managerEmployeeId: string,
  teamIds: string[],
) {
  if (teamIds.length === 0) return [];

  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .select(
      `
        id,
        leave_requests!inner (
          id,
          employee_id,
          start_date,
          end_date,
          total_days,
          leave_status,
          employees:employee_id!inner (first_name, last_name),
          leave_types:leave_type_id (name)
        )
      `,
    )
    .eq("approver_employee_id", managerEmployeeId)
    .eq("approval_status", "pending")
    .eq("leave_requests.leave_status", "pending")
    .in("leave_requests.employee_id", teamIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const leave = unwrap(row.leave_requests);
    const employee = unwrap(leave?.employees);
    const leaveType = unwrap(leave?.leave_types);
    return {
      id: row.id,
      leaveRequestId: leave?.id ?? "",
      employeeId: leave?.employee_id ?? "",
      employeeName: employee ? `${employee.first_name} ${employee.last_name}` : "Team member",
      leaveTypeName: leaveType?.name ?? "Leave",
      startDate: leave?.start_date ?? "",
      endDate: leave?.end_date ?? "",
      totalDays: Number(leave?.total_days ?? 0),
    };
  });
}

export async function listTeamPendingCorrections(
  supabase: AuthSupabaseClient,
  teamIds: string[],
) {
  if (teamIds.length === 0) return [];

  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance_corrections")
    .select(
      `
        id,
        employee_id,
        reason,
        created_at,
        employees:employee_id!inner (first_name, last_name),
        attendance:attendance_id (attendance_date)
      `,
    )
    .in("employee_id", teamIds)
    .eq("correction_status", "pending")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const employee = unwrap(row.employees);
    const attendance = unwrap(row.attendance);
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: employee ? `${employee.first_name} ${employee.last_name}` : "Team member",
      attendanceDate: attendance?.attendance_date ?? null,
      reason: row.reason,
      createdAt: row.created_at,
    };
  });
}
