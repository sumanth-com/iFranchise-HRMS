import { categoryForCode } from "@/lib/employee/documents/categories";

/**
 * Primary private employee-documents bucket (new uploads).
 * Legacy paths may still live in employee-documents.
 */
export const HRMS_DOCUMENTS_BUCKET = "hrms-documents";
export const LEGACY_DOCUMENTS_BUCKET = "employee-documents";

/** Hard ceiling for every employee document upload. */
export const EMPLOYEE_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const EMPLOYEE_DOCUMENT_MAX_MB = 10;
export const EMPLOYEE_DOCUMENT_STORAGE_LIMIT_BYTES = 500 * 1024 * 1024;

export const DOCUMENT_YEAR_OPTIONS = ["2025", "2026", "2027", "2028"] as const;

export function resolveDocumentsBucket(storagePath: string): string {
  if (storagePath.startsWith("employees/")) return HRMS_DOCUMENTS_BUCKET;
  return LEGACY_DOCUMENTS_BUCKET;
}

export function buildEmployeeDocumentStoragePath(input: {
  employeeId: string;
  documentTypeCode: string;
  fileName: string;
  year?: string | null;
  month?: string | null;
}): string {
  const category = categoryForCode(input.documentTypeCode);
  const subcategory = String(input.documentTypeCode || "OTHER")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_");
  const year = (input.year || "general").replace(/[^0-9]/g, "") || "general";
  const month =
    input.month && /^\d{2}$/.test(input.month) ? input.month : null;
  const period = month ? `${year}-${month}` : year;
  const sanitized = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `employees/${input.employeeId}/${category}/${subcategory}/${period}/${crypto.randomUUID()}-${sanitized}`;
}

export function parsePeriodFromNotes(notes: string | null | undefined): {
  year: string | null;
  month: string | null;
} {
  const match = String(notes ?? "").match(/^period:(\d{4})(?:-(\d{2}))?$/);
  if (!match) return { year: null, month: null };
  return { year: match[1] ?? null, month: match[2] ?? null };
}
