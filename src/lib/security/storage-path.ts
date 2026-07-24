/**
 * Ensure storage object paths stay within the caller's organization prefix.
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
  if (!normalized.startsWith(expectedPrefix)) {
    throw new Error("Storage path is outside your organization");
  }
}
