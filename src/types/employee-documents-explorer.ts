import type { EmployeeDocCategoryKey } from "@/lib/employee/documents/categories";
import type { DocumentSource, DocumentStatus } from "@/types/documents";

export type EmployeeDocVersion = {
  id: string;
  version: number;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storagePath: string;
  createdAt: string;
  isCurrent: boolean;
};

export type EmployeeDocFile = {
  id: string;
  categoryKey: EmployeeDocCategoryKey;
  documentTypeId: string;
  documentTypeName: string;
  documentTypeCode: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  status: DocumentStatus;
  source: DocumentSource;
  /** Company-issued / HR documents are read-only for employees. */
  isReadOnly: boolean;
  createdAt: string;
  versionCount: number;
  versions: EmployeeDocVersion[];
};

export type EmployeeDocFolder = {
  key: EmployeeDocCategoryKey;
  name: string;
  description: string;
  count: number;
  storageBytes: number;
  lastUpdated: string | null;
};

export type EmployeeDocumentTypeOption = {
  id: string;
  name: string;
  code: string;
  categoryKey: EmployeeDocCategoryKey;
};

export type EmployeeDocumentsStorage = {
  totalFiles: number;
  usedBytes: number;
  softLimitBytes: number;
  largestFile: { name: string; sizeBytes: number } | null;
};

export type EmployeeDocumentsExplorerData = {
  folders: EmployeeDocFolder[];
  files: EmployeeDocFile[];
  documentTypes: EmployeeDocumentTypeOption[];
  storage: EmployeeDocumentsStorage;
  maxUploadSizeMb: number;
  allowedFileTypes: string[];
};
