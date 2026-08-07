import { HR_HUB_ROUTES } from "@/lib/dashboard/hr-hub-routes";
import { isHubTeamPath } from "@/lib/dashboard/hub-paths";

type NavHrefItem = {
  href: string;
};

/** Management module paths highlight the corresponding Team * sidebar item. */
const TEAM_ADMIN_PATH_PREFIXES: Record<string, string> = {
  "/dashboard/leave-management": HR_HUB_ROUTES.teamLeave,
  "/dashboard/attendance-management": HR_HUB_ROUTES.teamAttendance,
  "/dashboard/payroll-management": HR_HUB_ROUTES.teamPayroll,
  "/dashboard/documents-management": HR_HUB_ROUTES.teamDocuments,
  "/dashboard/assets-management": HR_HUB_ROUTES.teamAssets,
  "/dashboard/onboarding": "/dashboard/recruitment",
};

function navItemPath(href: string) {
  return href.split("?")[0];
}

function resolvePrefixNavHref(
  pathname: string,
  prefixes: Record<string, string>,
  items: NavHrefItem[],
): string | null {
  for (const [prefix, navHref] of Object.entries(prefixes)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const match = items.find((item) => navItemPath(item.href) === navHref);
      if (match) return match.href;
    }
  }
  return null;
}

/**
 * Pick the sidebar link that matches the current path (my vs team hub sections).
 */
export function resolveActiveNavHref(
  pathname: string,
  searchParams: URLSearchParams,
  portalHome: string,
  items: NavHrefItem[],
): string | null {
  void searchParams;

  const teamAdminMatch = resolvePrefixNavHref(pathname, TEAM_ADMIN_PATH_PREFIXES, items);
  if (teamAdminMatch) return teamAdminMatch;

  const matches = items.filter((item) => {
    const itemPath = navItemPath(item.href);
    const itemIsTeam =
      itemPath.endsWith("/team") ||
      (itemPath.includes("/team/") && itemPath.split("/team").length > 1);

    if (itemIsTeam) {
      return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
    }

    const basePath = itemPath;

    // Portal home: exact match only — do not highlight Dashboard for every /dashboard/* route.
    if (basePath === portalHome) {
      return pathname === portalHome;
    }

    if (pathname === basePath) {
      return true;
    }

    if (pathname.startsWith(`${basePath}/`)) {
      return !isHubTeamPath(pathname, basePath);
    }

    return false;
  });

  if (matches.length === 0) {
    return null;
  }

  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}
