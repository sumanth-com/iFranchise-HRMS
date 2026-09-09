/** Client-safe storage snapshot types (no server-only imports). */

export type StorageBucketSnapshot = {
  id: string;
  name: string;
  public: boolean;
  fileCount: number;
  estimatedObjects: number;
};

export type StorageObjectRow = {
  /** Full path in bucket (e.g. orgId/employeeId/file.pdf) */
  path: string;
  /** Path relative to organization root for navigation */
  relativePath: string;
  displayName: string;
  isFolder: boolean;
  updatedAt: string | null;
  sizeBytes: number | null;
  mimeType: string | null;
};
