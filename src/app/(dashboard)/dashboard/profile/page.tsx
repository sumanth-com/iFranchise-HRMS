import { MyProfileView } from "@/components/employee/profile/my-profile-view";
import { PageScroll } from "@/components/common/sticky-layout";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { SELF_PROFILE_ROUTES } from "@/lib/documents/constants";
import { getMyProfileBundle } from "@/lib/employee/services/my-profile";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardProfilePage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.hr,
    "employee_profile.view",
  ]);
  const supabase = await createClient();
  const data = await getMyProfileBundle(
    supabase,
    profile,
    SELF_PROFILE_ROUTES.profile,
  );

  if (!data) {
    return (
      <PageScroll>
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Profile not found.
        </div>
      </PageScroll>
    );
  }

  return (
    <PageScroll>
      <MyProfileView data={data} />
    </PageScroll>
  );
}
