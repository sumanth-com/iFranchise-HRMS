export type HubSection = "my" | "team";

export const HUB_TEAM_SEGMENT = "team";

export function hubTeamPath(basePath: string): string {
  return `${basePath.replace(/\/$/, "")}/${HUB_TEAM_SEGMENT}`;
}

export function isHubTeamPath(pathname: string, basePath: string): boolean {
  const teamPath = hubTeamPath(basePath);
  return pathname === teamPath || pathname.startsWith(`${teamPath}/`);
}

export function resolveHubSection(pathname: string, basePath: string): HubSection {
  return isHubTeamPath(pathname, basePath) ? "team" : "my";
}

function collectFilterParams(
  raw: Record<string, string | string[] | undefined>,
  omitKeys: Set<string>,
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (omitKeys.has(key) || typeof value !== "string") continue;
    result[key] = value;
  }
  return result;
}

/** Build a hub URL with optional filter query params (never tab/section). */
export function hubListUrl(
  path: string,
  searchParams?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function hubTeamListUrl(
  basePath: string,
  searchParams?: Record<string, string | undefined>,
  subPath?: string,
): string {
  const teamBase = hubTeamPath(basePath);
  const path = subPath ? `${teamBase}/${subPath.replace(/^\//, "")}` : teamBase;
  return hubListUrl(path, searchParams);
}

type LegacyHubTabOptions = {
  /** When legacy URLs used `section` for team sub-pages (payroll). */
  teamSubPathFromSection?: boolean;
};

/**
 * Returns a redirect target when `tab` or legacy `section` query params are present.
 */
export function legacyHubTabRedirectUrl(
  basePath: string,
  raw: Record<string, string | string[] | undefined>,
  options?: LegacyHubTabOptions,
): string | null {
  const tab = typeof raw.tab === "string" ? raw.tab : undefined;
  const section = typeof raw.section === "string" ? raw.section : undefined;

  if (!tab && !section) return null;

  const omit = new Set(["tab"]);
  if (options?.teamSubPathFromSection) omit.add("section");
  const filters = collectFilterParams(raw, omit);

  let targetPath = basePath;

  if (tab === "team" || section) {
    const subPath =
      options?.teamSubPathFromSection && section && section !== "dashboard" ? section : undefined;
    targetPath = subPath ? hubTeamListUrl(basePath, undefined, subPath).split("?")[0] : hubTeamPath(basePath);
  }

  return hubListUrl(targetPath, filters);
}
