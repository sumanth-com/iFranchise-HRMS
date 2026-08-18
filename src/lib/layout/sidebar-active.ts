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

/** Module roots so nested tabs (e.g. Performance > Feedback) keep the sidebar item active. */
const MODULE_SECTION_ROOTS = [
  "/dashboard/performance",
  "/manager/performance",
  "/ceo/performance",
] as const;

function navItemPath(href: string | null | undefined) {
  if (typeof href !== "string" || href.length === 0) return "";
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

function resolveModuleSectionHref(
  pathname: string,
  items: NavHrefItem[],
): string | null {
  for (const root of MODULE_SECTION_ROOTS) {
    if (pathname !== root && !pathname.startsWith(`${root}/`)) continue;

    const exact = items.find((item) => navItemPath(item.href) === root);
    if (exact) return exact.href;

    const nested = items.find((item) => {
      const itemPath = navItemPath(item.href);
      return itemPath === root || itemPath.startsWith(`${root}/`);
    });
    if (nested) return nested.href;
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

  const navItems = items.filter((item) => typeof item?.href === "string" && item.href.length > 0);

  const teamAdminMatch = resolvePrefixNavHref(pathname, TEAM_ADMIN_PATH_PREFIXES, navItems);
  if (teamAdminMatch) return teamAdminMatch;

  const moduleSectionMatch = resolveModuleSectionHref(pathname, navItems);
  if (moduleSectionMatch) return moduleSectionMatch;

  const matches = navItems.filter((item) => {
    const itemPath = navItemPath(item.href);
    if (!itemPath) return false;
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
