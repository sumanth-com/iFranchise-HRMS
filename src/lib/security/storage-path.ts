/**
 * Ensure storage object paths stay within an allowed organization / employee prefix.
 * Supports legacy `{organizationId}/...` and new `employees/{employeeId}/...` layouts.
 * Callers must still verify document ownership via database metadata.
 */
export function assertOrganizationStoragePath(
  path: string,
  organizationId: string,
): void {
  const normalized = path.trim().replace(/\\/g, "/");
  if (!normalized || normalized.includes("..") || normalized.startsWith("/")) {
    throw new Error("Invalid storage path");
  }

  const expectedPrefix = `${organizationId}/`;
  if (normalized.startsWith(expectedPrefix)) return;

  // New structured employee paths: employees/{uuid}/category/...
  if (/^employees\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i.test(normalized)) {
    return;
  }

  throw new Error("Storage path is outside your organization");
}
