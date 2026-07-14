"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { inviteEmployeeByEmail } from "@/lib/employees/services/employee-account";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import {
  requireServerAnyPermission,
} from "@/lib/permissions/server";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const inviteTeamMemberSchema = z.object({
  email: z.string().trim().email("Enter a valid work email"),
});

export async function inviteTeamMemberAction(input: unknown): Promise<
  | { success: true; message: string }
  | { success: false; message: string }
> {
  try {
    if (!hasSupabaseServiceRoleEnv()) {
      return {
        success: false,
        message:
          "Employee invitations are not configured on this environment. Contact your administrator.",
      };
    }

    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.manager,
      "manager.team.invite",
    ]);
    const parsed = inviteTeamMemberSchema.parse(input);
    const supabase = await createClient();

    const { data: managerRow, error: managerError } = await supabase
      .schema("hrms")
      .from("employees")
      .select("department_id, branch_id")
      .eq("id", profile.employee.id)
      .maybeSingle();

    if (managerError) throw new Error(managerError.message);

    await inviteEmployeeByEmail(supabase, profile, parsed.email, {
      reportingManagerId: profile.employee.id,
      departmentId: managerRow?.department_id ?? null,
      branchId: managerRow?.branch_id ?? profile.employee.branchId,
    });

    revalidatePath(MANAGER_ROUTES.home);
    revalidatePath(MANAGER_ROUTES.team);

    return {
      success: true,
      message: `Invitation sent to ${parsed.email}. They will receive an email to activate their portal account.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send invitation",
    };
  }
}
