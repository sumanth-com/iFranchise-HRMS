import { type ReactNode, Suspense } from "react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DashboardShellFallback } from "@/components/layout/dashboard-shell-fallback";
import { DesktopOnlyGate } from "@/components/layout/desktop-only-gate";
import { ModulePageSkeleton } from "@/components/layout/module-page-skeleton";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { getLayoutUserProfile } from "@/lib/auth/layout-profile";
import { PORTAL_PERMISSIONS, type PortalKey } from "@/lib/auth/portals";
import { hasPermission } from "@/lib/permissions/utils";
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

  const profileStartedAt = performance.now();
  const profileResult = await getLayoutUserProfile(user.id, email, supabase);
  logLayout("layout:getLayoutUserProfile", profileStartedAt);

  if (!profileResult.success) {
    if (profileResult.error !== "PROFILE_LOOKUP_FAILED") {
      await supabase.auth.signOut();
    }
    redirect(`${AUTH_ROUTES.login}?error=${profileResult.error}`);
  }

  const requiredPortalPermission =
    PORTAL_PERMISSIONS[portalVariant as PortalKey] ?? PORTAL_PERMISSIONS.hr;
  if (!hasPermission(profileResult.profile.permissionCodes, requiredPortalPermission)) {
    redirect(AUTH_ROUTES.unauthorized);
  }

  logLayout("layout:total_before_children", layoutStartedAt);

  return (
    <AuthProvider
      initialProfile={profileResult.profile}
      portalVariant={portalVariant}
      portalLabel={portalLabel}
    >
      {/* Phones and tablets get the desktop notice instead of the portal. */}
      <DesktopOnlyGate>
        <DashboardShell>
          {/* Stream page RSC after shell chrome so soft-nav is not blank while module data loads. */}
          <Suspense fallback={<ModulePageSkeleton />}>{children}</Suspense>
        </DashboardShell>
      </DesktopOnlyGate>
    </AuthProvider>
  );
}
