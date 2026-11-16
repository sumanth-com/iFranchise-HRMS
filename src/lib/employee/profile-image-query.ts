import { cache } from "react";
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";

/** Deduplicate the identical shell/card read within one server render only. */
export const getEmployeeProfileImageRow = cache(
  async (supabase: AuthSupabaseClient, employeeId: string) =>
    supabase
      .schema("hrms")
      .from("employee_profiles")
      .select("profile_image_storage_path")
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .maybeSingle(),
);
