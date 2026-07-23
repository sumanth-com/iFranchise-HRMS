export const SYSTEM_ADMIN_PREFIX = "/dashboard/system";

export function isSystemAdminPath(pathname: string): boolean {
  return (
    pathname === SYSTEM_ADMIN_PREFIX ||
    pathname.startsWith(`${SYSTEM_ADMIN_PREFIX}/`)
  );
}
