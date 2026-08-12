import { OrganizationProfileForm } from "@/components/organization/organization-profile-form";
import { canEditProfile } from "@/lib/organization/constants";
import { getOrganizationLogoSignedUrl } from "@/lib/organization/services/org-logo";
import { getOrganizationProfile } from "@/lib/organization/services/org-queries";
import { ORGANIZATION_VIEW_PERMISSIONS } from "@/lib/organization/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function OrganizationProfilePage() {
  const profile = await requireServerAnyPermission([...ORGANIZATION_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const orgProfile = await getOrganizationProfile(supabase, profile.employee.organizationId);

  if (!orgProfile) {
    return <p className="text-muted-foreground">Organization not found.</p>;
  }

  const logoUrl = await getOrganizationLogoSignedUrl(supabase, orgProfile.logoStoragePath);

  return (
    <OrganizationProfileForm
      profile={orgProfile}
      logoUrl={logoUrl}
      canEdit={canEditProfile(profile.permissionCodes)}
    />
  );
}
