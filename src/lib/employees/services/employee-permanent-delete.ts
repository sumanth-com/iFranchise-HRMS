import type { UserProfile } from "@/types/auth";

import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import { createAdminClient } from "@/lib/supabase/admin";

type PermanentDeleteResult = {
  employee_id: string;
  employee_code: string;
  full_name: string;
  email: string;
  user_id: string | null;
  profile_image_storage_path: string | null;
  document_storage_paths: string[];
  payslip_storage_paths: string[];
};

function uniquePaths(paths: Array<string | null | undefined>) {
  return [...new Set(paths.filter((path): path is string => Boolean(path?.trim())))];
}

async function removeStorageObjects(bucket: string, paths: string[]) {
  if (paths.length === 0) return;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).remove(paths);
  if (error) {
    console.error(`Failed to remove ${bucket} objects during employee delete`, error);
  }
}

export async function permanentlyDeleteEmployee(
  profile: UserProfile,
  employeeId: string,
): Promise<{ fullName: string; employeeCode: string }> {
  if (profile.employee.id === employeeId) {
    throw new Error("You cannot delete your own employee account.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.schema("hrms").rpc("permanently_delete_employee", {
    p_organization_id: profile.employee.organizationId,
    p_employee_id: employeeId,
    p_deleted_by: profile.userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = data as PermanentDeleteResult;

  const documentPaths = uniquePaths(result.document_storage_paths ?? []);
  const payslipPaths = uniquePaths(result.payslip_storage_paths ?? []);
  const profileImagePath = result.profile_image_storage_path?.trim() || null;

  await Promise.all([
    removeStorageObjects(EMPLOYEE_STORAGE_BUCKETS.documents, [
      ...documentPaths,
      ...payslipPaths,
    ]),
    profileImagePath
      ? removeStorageObjects(EMPLOYEE_STORAGE_BUCKETS.profileImages, [profileImagePath])
      : Promise.resolve(),
  ]);

  if (result.user_id) {
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(result.user_id);
    if (authDeleteError) {
      throw new Error(
        `Employee records were removed, but login access could not be revoked: ${authDeleteError.message}`,
      );
    }
  }

  return {
    fullName: result.full_name,
    employeeCode: result.employee_code,
  };
}
