import { hubTeamPath, isHubTeamPath } from "@/lib/dashboard/hub-paths";

type NavHrefItem = {
  href: string;
};

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

  const matches = items.filter((item) => {
    const itemPath = item.href.split("?")[0];
    const itemIsTeam =
      itemPath.endsWith("/team") ||
      (itemPath.includes("/team/") && itemPath.split("/team").length > 1);

    if (itemIsTeam) {
      return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
    }

    const basePath = itemPath;
    if (pathname === basePath) {
      return true;
    }

    if (pathname.startsWith(`${basePath}/`)) {
      return !isHubTeamPath(pathname, basePath);
    }

    if (basePath === portalHome) {
      return pathname === portalHome;
    }

    return false;
  });

  if (matches.length === 0) {
    return null;
  }

  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}
