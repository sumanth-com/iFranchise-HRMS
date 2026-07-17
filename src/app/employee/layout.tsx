import { type ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { loadUserProfile } from "@/lib/auth/profile-loader";
import { AuthProvider } from "@/providers/auth-provider";
import { createClient } from "@/lib/supabase/server";

type EmployeeLayoutProps = {
  children: ReactNode;
};

export default async function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    redirect(AUTH_ROUTES.login);
  }

  const profileResult = await loadUserProfile(user.id, user.email, supabase);

  if (!profileResult.success) {
    await supabase.auth.signOut();
    redirect(`${AUTH_ROUTES.login}?error=${profileResult.error}`);
  }

  return (
    <AuthProvider initialProfile={profileResult.profile} portalVariant="employee">
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
