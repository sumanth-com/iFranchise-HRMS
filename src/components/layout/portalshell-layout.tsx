import { type ReactNode, Suspense } from "react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DashboardShellFallback } from "@/components/layout/dashboard-shell-fallback";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { getLayoutUserProfile } from "@/lib/auth/layout-profile";
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
  const session = await getServerSession();
  if (!session) {
    redirect(AUTH_ROUTES.login);
  }

  const { supabase, user } = session;
  const email = user.email;
  if (!email) {
    redirect(AUTH_ROUTES.login);
  }

  const profileResult = await getLayoutUserProfile(user.id, email, supabase);

  if (!profileResult.success) {
    await supabase.auth.signOut();
    redirect(`${AUTH_ROUTES.login}?error=${profileResult.error}`);
  }

  return (
    <AuthProvider
      initialProfile={profileResult.profile}
      portalVariant={portalVariant}
      portalLabel={portalLabel}
    >
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
