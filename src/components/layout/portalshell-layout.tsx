import { type ReactNode, Suspense } from "react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DashboardShellFallback } from "@/components/layout/dashboard-shell-fallback";
import { DesktopOnlyGate } from "@/components/layout/desktop-only-gate";
import { DeviceKindReporter } from "@/components/layout/device-kind-reporter";
import { TabletAccessDenied } from "@/components/layout/tablet-access-denied";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { getLayoutUserProfile } from "@/lib/auth/layout-profile";
import { PORTAL_PERMISSIONS, type PortalKey } from "@/lib/auth/portals";
import { isTabletHrmsAllowed } from "@/lib/device-access/access";
import { isTabletClientRequest } from "@/lib/device-access/request";
import { hasPermission } from "@/lib/permissions/utils";
import { SYSTEM_ADMIN_PERMISSION } from "@/lib/system-admin/constants";
import { AuthProvider, type PortalVariant } from "@/providers/auth-provider";
import { getServerSession } from "@/lib/supabase/server";

type PortalShellLayoutProps = {
  children: ReactNode;
  portalVariant?: PortalVariant;
  portalLabel?: string;
};

export function PortalShellLayout({
  children,
  portalVariant = "hr",
  portalLabel,
}: PortalShellLayoutProps) {
  return (
    <Suspense fallback={<DashboardShellFallback />}>
      <ResolvedPortalShell
        portalVariant={portalVariant}
        portalLabel={portalLabel}
      >
        {children}
      </ResolvedPortalShell>
    </Suspense>
  );
}

async function ResolvedPortalShell({
  children,
  portalVariant = "hr",
  portalLabel,
}: PortalShellLayoutProps) {
  const layoutStartedAt = performance.now();
  const logLayout = (label: string, startedAt: number) => {
    if (process.env.NODE_ENV !== "development") return;
    console.info("[perf]", {
      area: "layout",
      source: "layout-timing",
      atMs: Math.round(performance.now() - startedAt),
      label,
    });
  };

  const sessionStartedAt = performance.now();
  const session = await getServerSession();
  logLayout("layout:getServerSession", sessionStartedAt);

  if (!session) {
    redirect(AUTH_ROUTES.login);
  }

  const { supabase, user } = session;
  const email = user.email;
  if (!email) {
    redirect(AUTH_ROUTES.login);
  }

  // Overlap tablet UA check with profile load (independent of DB).
  const profileStartedAt = performance.now();
  const [profileResult, tabletClient] = await Promise.all([
    getLayoutUserProfile(user.id, email, supabase),
    isTabletClientRequest(),
  ]);
  logLayout("layout:getLayoutUserProfile+tablet", profileStartedAt);

  if (!profileResult.success) {
    if (profileResult.error !== "PROFILE_LOOKUP_FAILED") {
      await supabase.auth.signOut();
    }
    redirect(`${AUTH_ROUTES.login}?error=${profileResult.error}`);
  }

  const requiredPortalPermission =
    PORTAL_PERMISSIONS[portalVariant as PortalKey] ?? PORTAL_PERMISSIONS.hr;
  const codes = profileResult.profile.permissionCodes;
  const hasRequiredPortal = hasPermission(codes, requiredPortalPermission);
  // HR shell is shared with /dashboard/system. System-only Super Admins may load
  // the shell without portal.hr.access; nested layout + middleware still block HR routes.
  const canUseSharedHrShell =
    portalVariant === "hr" && hasPermission(codes, SYSTEM_ADMIN_PERMISSION);

  if (!hasRequiredPortal && !canUseSharedHrShell) {
    redirect(AUTH_ROUTES.unauthorized);
  }

  logLayout("layout:total_before_children", layoutStartedAt);

  const tabletAllowed =
    portalVariant !== "employee" ||
    isTabletHrmsAllowed(profileResult.profile, tabletClient);

  return (
    <AuthProvider
      initialProfile={profileResult.profile}
      portalVariant={portalVariant}
      portalLabel={portalLabel}
    >
      <DeviceKindReporter />
      {/* Viewport width never blocks the shell; tablet UA grant is separate. */}
      <DesktopOnlyGate>
        {tabletAllowed ? (
          <DashboardShell>
            {/* Soft-nav: keep prior module visible while the next RSC streams.
                Do not swap the main pane to a full skeleton (loading.tsx removed). */}
            <Suspense fallback={null}>{children}</Suspense>
          </DashboardShell>
        ) : (
          <TabletAccessDenied />
        )}
      </DesktopOnlyGate>
    </AuthProvider>
  );
}
