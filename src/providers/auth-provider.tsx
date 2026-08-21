"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";
import { LOGOUT_BROADCAST_KEY, AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/auth/constants";
import { logoutAction } from "@/lib/auth/actions";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { getSidebarNavigation } from "@/lib/auth/navigation";
import { ceoNavItems } from "@/config/ceo-navigation";
import { employeeNavItems } from "@/config/employee-navigation";
import { mainNavItems, type NavItem } from "@/config/navigation";
import { managerNavItems } from "@/config/manager-navigation";
import type { NavigationItem } from "@/lib/auth/navigation";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { createClient } from "@/lib/supabase/client";
import { UnsavedChangesProvider } from "@/providers/unsaved-changes-provider";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
} from "@/lib/permissions/utils";
import type { Role, UserProfile } from "@/types/auth";

type AuthContextValue = {
  profile: UserProfile;
  permissionCodes: string[];
  roles: Role[];
  navigation: NavItem[];
  portalHome: string;
  portalLabel: string;
  isLoading: boolean;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasAnyRole: (roleCodes: string[]) => boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export type PortalVariant = "hr" | "manager" | "ceo" | "employee";

const PORTAL_CONFIG: Record<
  PortalVariant,
  { navItems: NavigationItem[]; home: string; label: string }
> = {
  hr: {
    navItems: mainNavItems,
    home: HR_PORTAL_HOME,
    label: "HR Portal",
  },
  manager: {
    navItems: managerNavItems,
    home: MANAGER_ROUTES.home,
    label: "Manager Portal",
  },
  ceo: {
    navItems: ceoNavItems,
    home: CEO_ROUTES.home,
    label: "Executive Portal",
  },
  employee: {
    navItems: employeeNavItems,
    home: EMPLOYEE_ROUTES.home,
    label: "Employee Portal",
  },
};

type AuthProviderProps = {
  children: ReactNode;
  initialProfile: UserProfile;
  portalVariant?: PortalVariant;
  portalHome?: string;
  portalLabel?: string;
};

export function AuthProvider({
  children,
  initialProfile,
  portalVariant = "hr",
  portalHome,
  portalLabel,
}: AuthProviderProps) {
  const portalConfig = PORTAL_CONFIG[portalVariant];
  const resolvedPortalHome = portalHome ?? portalConfig.home;
  const resolvedPortalLabel = portalLabel ?? portalConfig.label;
  const navItems = portalConfig.navItems;
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const permissionCodes = profile.permissionCodes;
  const roles = profile.roles;

  const navigation = useMemo(
    () => getSidebarNavigation(navItems, permissionCodes, roles),
    [navItems, permissionCodes, roles],
  );

  const performSignOut = useCallback(
    async (broadcast = true) => {
      setIsLoading(true);
      try {
        if (broadcast) {
          localStorage.setItem(LOGOUT_BROADCAST_KEY, Date.now().toString());
        }
        await logoutAction();
      } catch (error) {
        const digest =
          typeof error === "object" && error !== null && "digest" in error
            ? String((error as { digest?: string }).digest ?? "")
            : "";
        if (digest.startsWith("NEXT_REDIRECT")) {
          return;
        }
        toast.error(getAuthErrorMessage("SERVER_ERROR"));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    await performSignOut(true);
  }, [performSignOut]);

  const refreshProfile = useCallback(async () => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const pathname = window.location.pathname;
      const isPublicAuthRoute = PUBLIC_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      );

      if (
        event === "SIGNED_OUT" &&
        pathname !== AUTH_ROUTES.login &&
        !isPublicAuthRoute
      ) {
        router.push(`${AUTH_ROUTES.login}?expired=1`);
        router.refresh();
        return;
      }

      // Same-origin cookies are shared across tabs. If another tab signs in as a
      // different user, hard-reload so header/profile/data never mix identities.
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        const nextUserId = session?.user?.id;
        if (nextUserId && nextUserId !== profile.userId) {
          toast.message("Session updated", {
            description: "Another sign-in replaced this browser session. Reloading…",
          });
          window.location.assign(resolvedPortalHome);
          return;
        }
        router.refresh();
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [profile.userId, resolvedPortalHome, router, supabase.auth]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOGOUT_BROADCAST_KEY && event.newValue) {
        void performSignOut(false);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [performSignOut]);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      permissionCodes,
      roles,
      navigation,
      portalHome: resolvedPortalHome,
      portalLabel: resolvedPortalLabel,
      isLoading,
      signOut,
      refreshProfile,
      hasPermission: (permission: string) =>
        hasPermission(permissionCodes, permission),
      hasAnyPermission: (permissions: string[]) =>
        hasAnyPermission(permissionCodes, permissions),
      hasAllPermissions: (permissions: string[]) =>
        hasAllPermissions(permissionCodes, permissions),
      hasAnyRole: (roleCodes: string[]) => hasAnyRole(roles, roleCodes),
    }),
    [
      profile,
      permissionCodes,
      roles,
      navigation,
      resolvedPortalHome,
      resolvedPortalLabel,
      isLoading,
      signOut,
      refreshProfile,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      <UnsavedChangesProvider>{children}</UnsavedChangesProvider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
