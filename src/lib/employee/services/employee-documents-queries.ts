import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  categoryForCode,
  EMPLOYEE_DOC_CATEGORY_DESCRIPTIONS,
  EMPLOYEE_DOC_CATEGORY_LABELS,
  EMPLOYEE_DOC_CATEGORY_ORDER,
} from "@/lib/employee/documents/categories";
import { getDocumentSettings } from "@/lib/documents/services/document-settings";
import { DocRow, fromHrms, unwrapRelation } from "@/lib/documents/services/documents-utils";
import type { UserProfile } from "@/types/auth";
import type { DocumentSource, DocumentStatus } from "@/types/documents";
import type {
  EmployeeDocFile,
  EmployeeDocFolder,
  EmployeeDocVersion,
  EmployeeDocumentsExplorerData,
} from "@/types/employee-documents-explorer";

/** Soft per-employee storage budget used for the "remaining storage" indicator. */
const SOFT_STORAGE_LIMIT_BYTES = 500 * 1024 * 1024;

const EXPLORER_SELECT = `
  id, document_type_id, title, storage_path, file_name, mime_type, file_size_bytes,
  document_status, source, is_official, archived_at, replaced_by_id, created_at,
  document_types:document_type_id(name, code)
`;

/**
 * Aggregates everything the Employee Self-Service document explorer needs, scoped
 * strictly to the signed-in employee. Includes archived rows so version history can
 * be reconstructed from the `replaced_by_id` chain without exposing them as folders.
 */
export async function getEmployeeDocumentsExplorer(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<EmployeeDocumentsExplorerData> {
  const employeeId = profile.employee.id;
  const organizationId = profile.employee.organizationId;

  const { data, error } = await fromHrms(supabase, "employee_documents")
    .select(EXPLORER_SELECT)
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as DocRow[];

  // successorId -> predecessor rows (older versions that were replaced by it)
  const predecessorsOf = new Map<string, DocRow[]>();
  for (const row of rows) {
    if (row.replaced_by_id) {
      const list = predecessorsOf.get(row.replaced_by_id) ?? [];
      list.push(row);
      predecessorsOf.set(row.replaced_by_id, list);
    }
  }

  const collectChain = (rootId: string): DocRow[] => {
    const chain: DocRow[] = [];
    const walk = (id: string) => {
      for (const predecessor of predecessorsOf.get(id) ?? []) {
        chain.push(predecessor);
        walk(predecessor.id);
      }
    };
    walk(rootId);
    return chain;
  };

  const currentRows = rows.filter((row) => !row.archived_at);

  const files: EmployeeDocFile[] = currentRows.map((row) => {
    const docType = unwrapRelation(row.document_types);
    const code = docType?.code ?? "OTHER";

    const versionRows = [row, ...collectChain(row.id)].sort((a, b) =>
      String(a.created_at).localeCompare(String(b.created_at)),
    );

    const versions: EmployeeDocVersion[] = versionRows
      .map((vr, index) => ({
        id: vr.id,
        version: index + 1,
        fileName: vr.file_name,
        fileSizeBytes: Number(vr.file_size_bytes ?? 0),
        mimeType: vr.mime_type,
        storagePath: vr.storage_path,
        createdAt: vr.created_at,
        isCurrent: vr.id === row.id,
      }))
      .reverse();

    return {
      id: row.id,
      categoryKey: categoryForCode(code),
      documentTypeId: row.document_type_id,
      documentTypeName: docType?.name ?? "Document",
      documentTypeCode: code,
      title: row.title,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSizeBytes: Number(row.file_size_bytes ?? 0),
      storagePath: row.storage_path,
      status: row.document_status as DocumentStatus,
      source: (row.source ?? "upload") as DocumentSource,
      isReadOnly: Boolean(row.is_official) || (row.source ?? "upload") !== "upload",
      createdAt: row.created_at,
      versionCount: versions.length,
      versions,
    };
  });

  const folders: EmployeeDocFolder[] = EMPLOYEE_DOC_CATEGORY_ORDER.map((key) => {
    const inCategory = files.filter((file) => file.categoryKey === key);
    const storageBytes = inCategory.reduce((sum, file) => sum + file.fileSizeBytes, 0);
    const lastUpdated = inCategory.reduce<string | null>(
      (latest, file) => (!latest || file.createdAt > latest ? file.createdAt : latest),
      null,
    );
    return {
      key,
      name: EMPLOYEE_DOC_CATEGORY_LABELS[key],
      description: EMPLOYEE_DOC_CATEGORY_DESCRIPTIONS[key],
      count: inCategory.length,
      storageBytes,
      lastUpdated,
    };
  });

  const usedBytes = files.reduce((sum, file) => sum + file.fileSizeBytes, 0);
  const largest = files.reduce<EmployeeDocFile | null>(
    (max, file) => (!max || file.fileSizeBytes > max.fileSizeBytes ? file : max),
    null,
  );

  const [settings, typesResult] = await Promise.all([
    getDocumentSettings(supabase, organizationId),
    fromHrms(supabase, "document_types")
      .select("id, name, code")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (typesResult.error) throw new Error(typesResult.error.message);

  const documentTypes = ((typesResult.data ?? []) as DocRow[])
    .map((type) => ({
      id: type.id as string,
      name: type.name as string,
      code: type.code as string,
      categoryKey: categoryForCode(type.code as string),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    folders,
    files,
    documentTypes,
    storage: {
      totalFiles: files.length,
      usedBytes,
      softLimitBytes: SOFT_STORAGE_LIMIT_BYTES,
      largestFile: largest ? { name: largest.fileName, sizeBytes: largest.fileSizeBytes } : null,
    },
    maxUploadSizeMb: settings.maxUploadSizeMb,
    allowedFileTypes: settings.allowedFileTypes,
  };
}
