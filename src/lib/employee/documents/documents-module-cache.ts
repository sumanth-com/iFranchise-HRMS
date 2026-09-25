import {
  invalidateModuleSoftCache,
  moduleSoftCacheKey,
} from "@/lib/perf/module-soft-cache";

export const EMPLOYEE_DOCUMENTS_MODULE_ID = "employee-documents-explorer";

export function invalidateEmployeeDocumentsSoftCache(scope: {
  organizationId: string;
  employeeId: string;
}) {
  invalidateModuleSoftCache(moduleSoftCacheKey(EMPLOYEE_DOCUMENTS_MODULE_ID, scope));
}
