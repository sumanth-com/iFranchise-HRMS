import { createAdminClient } from "@/lib/supabase/admin";

export async function syncUserAuthRoleMetadata(
  userId: string,
  organizationId: string,
  roleCode: string,
) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      role: roleCode,
      organization_id: organizationId,
      invited: true,
    },
  });
  if (error) {
    throw new Error(`Failed to sync auth role metadata: ${error.message}`);
  }
}
