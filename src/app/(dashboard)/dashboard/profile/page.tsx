import { MyProfileView } from "@/components/employee/profile/my-profile-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { canEditSelfProfileContactDetails } from "@/lib/employee/profile-contact";
import { SELF_PROFILE_ROUTES } from "@/lib/documents/constants";
import { getMyProfileBundle } from "@/lib/employee/services/my-profile";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardProfilePage() {
  const pageStartedAt = performance.now();
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.hr,
    "employee_profile.view",
  ]);
  const supabase = await createClient();

  const canEditContactDetails = canEditSelfProfileContactDetails(profile.permissionCodes);

  const loadStartedAt = performance.now();
  const data = await getMyProfileBundle(supabase, profile, SELF_PROFILE_ROUTES.profile);
  if (process.env.NODE_ENV === "development") {
    console.info(
      `[dashboard/profile] profile: ${Math.round(performance.now() - loadStartedAt)}ms`,
    );
    console.info(
      `[dashboard/profile] page total: ${Math.round(performance.now() - pageStartedAt)}ms`,
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Profile not found.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
      <MyProfileView
        data={data}
        canEditContactDetails={canEditContactDetails}
      />
    </div>
  );
}
