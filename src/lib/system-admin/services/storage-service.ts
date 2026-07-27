import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import { ASSET_IMAGE_BUCKET } from "@/lib/assets/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertOrganizationStoragePath } from "@/lib/security/storage-path";

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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FOLDER_LABELS: Record<string, string> = {
  bonuses: "Bonus attachments",
  payslips: "Payslips",
  assets: "Asset images",
  "system-backups": "System backups",
  documents: "Documents",
};

function isStorageFolder(item: { id: string | null; metadata: Record<string, unknown> | null }) {
  if (item.id === null) return true;
  const meta = item.metadata;
  if (!meta) return true;
  return meta.size === undefined && meta.mimetype === undefined;
}

function prettifyFileName(name: string): string {
  const withoutUuid = name.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
    "",
  );
  return withoutUuid || name;
}

async function resolveEmployeeFolderLabels(
  organizationId: string,
  folderIds: string[],
): Promise<Record<string, string>> {
  if (folderIds.length === 0) return {};

  const admin = createAdminClient();
  const { data } = await admin
    .schema("hrms")
    .from("employees")
    .select("id, first_name, last_name, employee_code")
    .eq("organization_id", organizationId)
    .in("id", folderIds);

  const labels: Record<string, string> = {};
  for (const row of data ?? []) {
    labels[row.id as string] = `${row.first_name} ${row.last_name} · ${row.employee_code}`;
  }
  return labels;
}

function labelForSegment(segment: string, employeeLabels: Record<string, string>): string {
  if (FOLDER_LABELS[segment]) return FOLDER_LABELS[segment];
  if (employeeLabels[segment]) return employeeLabels[segment];
  if (UUID_RE.test(segment)) return "Employee folder";
  return prettifyFileName(segment);
}

export async function listStorageBuckets(organizationId: string): Promise<StorageBucketSnapshot[]> {
  const admin = createAdminClient();
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw new Error(error.message);

  const snapshots: StorageBucketSnapshot[] = [];
  for (const bucket of buckets ?? []) {
    let fileCount = 0;
    try {
      const { data: objects } = await admin.storage
        .from(bucket.id)
        .list(organizationId, { limit: 100 });
      fileCount = objects?.length ?? 0;
    } catch {
      fileCount = 0;
    }
    snapshots.push({
      id: bucket.id,
      name: bucket.name,
      public: bucket.public ?? false,
      fileCount,
      estimatedObjects: fileCount,
    });
  }
  return snapshots;
}

export async function listStorageObjects(
  organizationId: string,
  bucket: string,
  relativePrefix = "",
): Promise<StorageObjectRow[]> {
  const admin = createAdminClient();
  const normalizedPrefix = relativePrefix.replace(/^\/+|\/+$/g, "");
  const listPath = normalizedPrefix
    ? `${organizationId}/${normalizedPrefix}`
    : organizationId;

  const { data, error } = await admin.storage.from(bucket).list(listPath, {
    limit: 100,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(error.message);

  const rawItems = data ?? [];
  const folderIds = rawItems
    .filter((item) => isStorageFolder(item))
    .map((item) => item.name)
    .filter((name) => UUID_RE.test(name));

  const employeeLabels = await resolveEmployeeFolderLabels(organizationId, folderIds);

  return rawItems.map((item) => {
    const relativePath = normalizedPrefix ? `${normalizedPrefix}/${item.name}` : item.name;
    const fullPath = `${organizationId}/${relativePath}`;
    const isFolder = isStorageFolder(item);
    const meta = item.metadata as { size?: number; mimetype?: string } | null;

    const displayName = isFolder
      ? labelForSegment(item.name, employeeLabels)
      : prettifyFileName(item.name);

    return {
      path: fullPath,
      relativePath,
      displayName,
      isFolder,
      updatedAt: item.updated_at ?? null,
      sizeBytes: meta?.size ?? null,
      mimeType: meta?.mimetype ?? null,
    };
  });
}

export async function deleteStorageObject(
  organizationId: string,
  bucket: string,
  objectPath: string,
): Promise<void> {
  const fullPath = objectPath.startsWith(organizationId)
    ? objectPath
    : `${organizationId}/${objectPath.replace(/^\/+/, "")}`;
  assertOrganizationStoragePath(fullPath, organizationId);

  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).remove([fullPath]);
  if (error) throw new Error(error.message);
}

export async function createStorageSignedUrl(
  organizationId: string,
  bucket: string,
  objectPath: string,
): Promise<string> {
  const fullPath = objectPath.startsWith(organizationId)
    ? objectPath
    : `${organizationId}/${objectPath.replace(/^\/+/, "")}`;
  assertOrganizationStoragePath(fullPath, organizationId);

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(fullPath, 3600);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Object not found");
  }
  return data.signedUrl;
}

export const MANAGED_BUCKETS = [
  EMPLOYEE_STORAGE_BUCKETS.documents,
  EMPLOYEE_STORAGE_BUCKETS.profileImages,
  ASSET_IMAGE_BUCKET,
] as const;
