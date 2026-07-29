import { type ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { getLayoutUserProfile } from "@/lib/auth/layout-profile";
import { AuthProvider, type PortalVariant } from "@/providers/auth-provider";
import { createClient } from "@/lib/supabase/server";

type PortalShellLayoutProps = {
  children: ReactNode;
  portalVariant?: PortalVariant;
  portalLabel?: string;
};

export async function PortalShellLayout({
  children,
  portalVariant = "hr",
  portalLabel,
}: PortalShellLayoutProps) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  if (!user?.email) {
    redirect(AUTH_ROUTES.login);
  }

  const profileResult = await getLayoutUserProfile(user.id, user.email);

  if (!profileResult.success) {
    const {
      data: { user: verifiedUser },
    } = await supabase.auth.getUser();

    if (!verifiedUser?.email) {
      redirect(AUTH_ROUTES.login);
    }

    const retry = await getLayoutUserProfile(verifiedUser.id, verifiedUser.email);
    if (!retry.success) {
      await supabase.auth.signOut();
      redirect(`${AUTH_ROUTES.login}?error=${retry.error}`);
    }

    return (
      <AuthProvider
        initialProfile={retry.profile}
        portalVariant={portalVariant}
        portalLabel={portalLabel}
      >
        <DashboardShell>{children}</DashboardShell>
      </AuthProvider>
    );
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
