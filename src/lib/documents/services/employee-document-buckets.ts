import {
  EMPLOYEE_DOC_CATEGORY_DESCRIPTIONS,
  EMPLOYEE_DOC_CATEGORY_LABELS,
  EMPLOYEE_DOC_CATEGORY_ORDER,
  categoryForCode,
  type EmployeeDocCategoryKey,
} from "@/lib/employee/documents/categories";
import type { EmployeeDocumentItem, EmployeeDocumentProfile, DocumentTypeItem } from "@/types/documents";

export type EmployeeDocumentBucket = {
  key: EmployeeDocCategoryKey;
  name: string;
  description: string;
  count: number;
  storageBytes: number;
  lastUpdated: string | null;
};

export type EmployeeDocumentGroup = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  designationTitle: string | null;
  documents: EmployeeDocumentItem[];
  buckets: EmployeeDocumentBucket[];
  totalBytes: number;
  pendingCount: number;
};

function buildBuckets(documents: EmployeeDocumentItem[]): EmployeeDocumentBucket[] {
  const bucketMap = new Map<EmployeeDocCategoryKey, EmployeeDocumentItem[]>();

  for (const document of documents) {
    const key = categoryForCode(document.documentTypeCode);
    const items = bucketMap.get(key) ?? [];
    items.push(document);
    bucketMap.set(key, items);
  }

  // Important: return *all* buckets (including empty ones) so the UI can
  // clearly show "available" vs "not yet added".
  return EMPLOYEE_DOC_CATEGORY_ORDER.map((key) => {
    const items = bucketMap.get(key) ?? [];
    const lastUpdated =
      items.length > 0
        ? items.reduce(
            (latest, item) => (item.createdAt > latest ? item.createdAt : latest),
            items[0].createdAt,
          )
        : null;

    return {
      key,
      name: EMPLOYEE_DOC_CATEGORY_LABELS[key],
      description: EMPLOYEE_DOC_CATEGORY_DESCRIPTIONS[key],
      count: items.length,
      storageBytes: items.reduce((sum, item) => sum + item.fileSizeBytes, 0),
      lastUpdated,
    };
  });
}

export function buildEmployeeDocumentGroup(
  profile: Pick<
    EmployeeDocumentProfile,
    | "employeeId"
    | "employeeCode"
    | "employeeName"
    | "departmentName"
    | "designationTitle"
    | "documents"
  >,
): EmployeeDocumentGroup {
  return {
    employeeId: profile.employeeId,
    employeeCode: profile.employeeCode,
    employeeName: profile.employeeName,
    departmentName: profile.departmentName,
    designationTitle: profile.designationTitle,
    documents: profile.documents,
    buckets: buildBuckets(profile.documents),
    totalBytes: profile.documents.reduce((sum, item) => sum + item.fileSizeBytes, 0),
    pendingCount: profile.documents.filter((item) => item.documentStatus === "pending").length,
  };
}

export function groupEmployeeDocuments(documents: EmployeeDocumentItem[]): EmployeeDocumentGroup[] {
  const byEmployee = new Map<string, EmployeeDocumentItem[]>();

  for (const document of documents) {
    const items = byEmployee.get(document.employeeId) ?? [];
    items.push(document);
    byEmployee.set(document.employeeId, items);
  }

  return Array.from(byEmployee.values())
    .map((items) => {
      const first = items[0];
      return {
        employeeId: first.employeeId,
        employeeCode: first.employeeCode,
        employeeName: first.employeeName,
        departmentName: first.departmentName,
        designationTitle: first.designationTitle,
        documents: items,
        buckets: buildBuckets(items),
        totalBytes: items.reduce((sum, item) => sum + item.fileSizeBytes, 0),
        pendingCount: items.filter((item) => item.documentStatus === "pending").length,
      };
    })
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName));
}

export function documentsForBucket(
  documents: EmployeeDocumentItem[],
  bucketKey: EmployeeDocCategoryKey,
) {
  return documents.filter((document) => categoryForCode(document.documentTypeCode) === bucketKey);
}

export function remainingDocumentTypesForBucket(
  bucketKey: EmployeeDocCategoryKey | null,
  documents: EmployeeDocumentItem[],
  allTypes: DocumentTypeItem[],
): DocumentTypeItem[] {
  const uploadedTypeIds = new Set(documents.map((document) => document.documentTypeId));

  return allTypes.filter((type) => {
    if (uploadedTypeIds.has(type.id)) return false;
    if (!bucketKey) return true;
    return categoryForCode(type.code) === bucketKey;
  });
}
