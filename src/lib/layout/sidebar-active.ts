import { HR_HUB_ROUTES } from "@/lib/dashboard/hr-hub-routes";
import { isHubTeamPath } from "@/lib/dashboard/hub-paths";

type NavHrefItem = {
  href: string;
};

/** Management and module roots that map nested URLs or aliased paths to their corresponding sidebar nav item. */
const MODULE_PREFIX_MAPPINGS: Record<string, string> = {
  // Team management hubs (Administration)
  "/dashboard/leave-management": HR_HUB_ROUTES.teamLeave,
  "/dashboard/leave/team": HR_HUB_ROUTES.teamLeave,
  "/dashboard/attendance-management": HR_HUB_ROUTES.teamAttendance,
  "/dashboard/attendance/team": HR_HUB_ROUTES.teamAttendance,
  "/dashboard/payroll-management": HR_HUB_ROUTES.teamPayroll,
  "/dashboard/payroll/team": HR_HUB_ROUTES.teamPayroll,
  "/dashboard/documents-management": HR_HUB_ROUTES.teamDocuments,
  "/dashboard/documents/team": HR_HUB_ROUTES.teamDocuments,
  "/dashboard/assets-management": HR_HUB_ROUTES.teamAssets,
  "/dashboard/assets/team": HR_HUB_ROUTES.teamAssets,

  // Recruitment and Onboarding modules
  "/dashboard/onboarding": "/dashboard/recruitment/jobs",
  "/dashboard/recruitment": "/dashboard/recruitment/jobs",
  "/manager/recruitment": "/manager/recruitment",
  "/ceo/recruitment": "/ceo/recruitment",

  // Reports
  "/dashboard/reports": "/dashboard/reports/attendance",
  "/manager/reports": "/manager/reports",
  "/ceo/reports": "/ceo/reports",

  // Performance
  "/dashboard/performance": "/dashboard/performance",
  "/manager/performance": "/manager/performance",
  "/ceo/performance": "/ceo/performance",

  // Organization & Setup
  "/dashboard/organization": "/dashboard/organization",
  "/ceo/organization": "/ceo/organization",

  // User Provisioning & Roles
  "/dashboard/user-provisioning": "/dashboard/user-provisioning",
  "/ceo/user-provisioning": "/ceo/user-provisioning",
  "/dashboard/roles": "/dashboard/roles",

  // Notifications
  "/dashboard/notifications": "/dashboard/notifications",
  "/manager/notifications": "/manager/notifications",
  "/ceo/notifications": "/ceo/notifications",

  // Manager Teammates
  "/manager/team": "/manager/team",
};

function navItemPath(href: string | null | undefined) {
  if (typeof href !== "string" || href.length === 0) return "";
  return href.split("?")[0];
}

function resolvePrefixNavHref(
  pathname: string,
  prefixes: Record<string, string>,
  items: NavHrefItem[],
): string | null {
  for (const [prefix, targetRoot] of Object.entries(prefixes)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const match = items.find((item) => {
        const itemPath = navItemPath(item.href);
        return itemPath === targetRoot || itemPath.startsWith(`${targetRoot}/`);
      });
      if (match) return match.href;
    }
  }
  return null;
}

/**
 * Pick the sidebar link that matches the current path (my vs team hub sections, module child tabs).
 */
export function resolveActiveNavHref(
  pathname: string,
  searchParams: URLSearchParams,
  portalHome: string,
  items: NavHrefItem[],
): string | null {
  void searchParams;

  const navItems = items.filter((item) => typeof item?.href === "string" && item.href.length > 0);

  const prefixMatch = resolvePrefixNavHref(pathname, MODULE_PREFIX_MAPPINGS, navItems);
  if (prefixMatch) return prefixMatch;

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
