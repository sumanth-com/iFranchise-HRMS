import { OrganizationProfileForm } from "@/components/organization/organization-profile-form";
import { canEditProfile } from "@/lib/organization/constants";
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

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Company Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage company information, addresses, and regional settings.
        </p>
      </div>
      <OrganizationProfileForm
        profile={orgProfile}
        canEdit={canEditProfile(profile.permissionCodes)}
      />
    </>
  );
}
