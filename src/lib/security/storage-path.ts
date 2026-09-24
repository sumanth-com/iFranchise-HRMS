const EMPLOYEE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OrganizationStoragePathOptions = {
  /**
   * When set, also allow legacy HR payslip PDFs stored as
   * `payslips/{employeeId}/...` (no org prefix). Callers must pass the
   * document's owned employee_id after DB ownership checks — never a
   * client-supplied employee id alone.
   */
  employeeId?: string | null;
};

/**
 * Ensure storage object paths stay within an allowed organization / employee prefix.
 * Supports legacy `{organizationId}/...` and new `employees/{employeeId}/...` layouts.
 * Optionally allows legacy `payslips/{employeeId}/...` when ownership is proven.
 * Callers must still verify document ownership via database metadata.
 */
export function assertOrganizationStoragePath(
  path: string,
  organizationId: string,
  options?: OrganizationStoragePathOptions,
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

  // Legacy payslip PDFs: payslips/{employeeId}/PS-....pdf (reuse payslips.storage_path).
  const ownedEmployeeId = options?.employeeId?.trim() ?? "";
  if (
    ownedEmployeeId &&
    EMPLOYEE_UUID_RE.test(ownedEmployeeId) &&
    normalized.toLowerCase().startsWith(`payslips/${ownedEmployeeId.toLowerCase()}/`)
  ) {
    return;
  }

  throw new Error("Storage path is outside your organization");
}
