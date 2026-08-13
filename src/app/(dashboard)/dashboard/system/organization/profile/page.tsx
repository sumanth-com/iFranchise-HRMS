import { OrganizationProfileForm } from "@/components/organization/organization-profile-form";
import {
  ORGANIZATION_VIEW_PERMISSIONS,
  canEditProfile,
} from "@/lib/organization/constants";
import { getOrganizationLogoSignedUrl } from "@/lib/organization/services/org-logo";
import { getOrganizationProfile } from "@/lib/organization/services/org-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { createClient } from "@/lib/supabase/server";

export default async function SuperAdminOrganizationProfilePage() {
  await requireSuperAdminProfile();
  const profile = await requireServerAnyPermission([...ORGANIZATION_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const orgProfile = await getOrganizationProfile(
    supabase,
    profile.employee.organizationId,
  );

  if (!orgProfile) {
    return <p className="text-muted-foreground">Organization not found.</p>;
  }

  const logoUrl = await getOrganizationLogoSignedUrl(
    supabase,
    orgProfile.logoStoragePath,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Company</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organizational identity and master company profile used across HRMS modules.
        </p>
      </div>
      <OrganizationProfileForm
        profile={orgProfile}
        logoUrl={logoUrl}
        canEdit={canEditProfile(profile.permissionCodes)}
      />
    </div>
  );
}
