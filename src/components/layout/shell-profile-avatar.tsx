import { ShellProfileAvatarHydrator } from "@/components/layout/shell-profile-avatar-hydrator";
import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import { assertOrganizationStoragePath } from "@/lib/security/storage-path";
import { createSignedStorageUrlIfExists } from "@/lib/storage/signed-url";
import { getServerSession } from "@/lib/supabase/server";

/**
 * Signs the layout profile photo after the portal shell has already rendered.
 * Uses the session cached for this request. Does not load profile or permissions again.
 * A missing object stays unsigned, so the header keeps initials.
 */
export async function ShellProfileAvatar({
  employeeId,
  organizationId,
  storagePath,
}: {
  employeeId: string;
  organizationId: string;
  storagePath: string | null;
}) {
  const path = storagePath?.trim() ?? "";
  if (!employeeId || !path) return null;

  try {
    assertOrganizationStoragePath(path, organizationId);
  } catch {
    return null;
  }

  const session = await getServerSession();
  if (!session) return null;

  const signedUrl = await createSignedStorageUrlIfExists(
    session.supabase,
    EMPLOYEE_STORAGE_BUCKETS.profileImages,
    path,
  ).catch(() => null);

  if (!signedUrl) return null;

  return <ShellProfileAvatarHydrator employeeId={employeeId} imageUrl={signedUrl} />;
}
