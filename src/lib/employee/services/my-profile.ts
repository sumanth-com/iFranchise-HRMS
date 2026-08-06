import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { MyProfileBundle } from "@/types/my-profile";
import { getEmployeeAttendanceSummary, getEmployeeById } from "@/lib/employees/services/employee-detail";
import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import { createSignedStorageUrl } from "@/lib/employees/services/employee-mutations";
import { getEmployeeSelfProfileSettings } from "@/lib/employee/services/employee-self-profile";

export async function getMyProfileBundle(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  profilePath: string,
): Promise<MyProfileBundle | null> {
  const employeeId = profile.employee?.id;
  if (!employeeId) return null;

  const [employee, attendanceSummary, profileSettings, submittedResult] = await Promise.all([
    getEmployeeById(supabase, employeeId),
    getEmployeeAttendanceSummary(supabase, employeeId),
    getEmployeeSelfProfileSettings(supabase, profile),
    supabase
      .schema("hrms")
      .from("employee_profiles")
      .select("self_profile_submitted_at")
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  if (!employee || !profileSettings) return null;

  let profileImageUrl: string | null = null;
  if (employee.profile?.profileImageStoragePath) {
    profileImageUrl = await createSignedStorageUrl(
      supabase,
      EMPLOYEE_STORAGE_BUCKETS.profileImages,
      employee.profile.profileImageStoragePath,
    );
  }

  return {
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    employmentStatus: employee.employmentStatus,
    accountStatus: employee.accountStatus,
    departmentName: employee.departmentName,
    designationTitle: employee.designationTitle,
    employmentTypeName: employee.employmentTypeName,
    reportingManagerId: employee.reportingManagerId,
    reportingManagerName: employee.reportingManagerName,
    dateOfJoining: employee.dateOfJoining,
    attendanceSummary: {
      presentDays: attendanceSummary.presentDays,
      totalWorkHours: attendanceSummary.totalWorkHours,
    },
    profileImageUrl,
    profileSettings,
    selfProfileSubmittedAt: submittedResult.data?.self_profile_submitted_at ?? null,
    profilePath,
  };
}
