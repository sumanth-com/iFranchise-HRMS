"use client";

import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  CircleUserRound,
  Download,
  Eye,
  FileUp,
  Loader2,
  ShieldCheck,
  ShieldX,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { DocumentUploadModal } from "@/components/documents/document-upload-modal";
import { useDocumentFileActions } from "@/components/documents/use-document-actions";
import { CATEGORY_META, FileThumbnail } from "@/components/employee/documents/document-icons";
import {
  DOCUMENTS_ROUTES,
  canDeleteDocuments,
  canEditDocuments,
  canUploadDocuments,
} from "@/lib/documents/constants";
import {
  buildEmployeeDocumentGroup,
  documentsForBucket,
  remainingDocumentTypesForBucket,
  type EmployeeDocumentBucket,
  type EmployeeDocumentGroup,
} from "@/lib/documents/services/employee-document-buckets";
import { formatBytes } from "@/lib/documents/services/documents-utils";
import {
  EMPLOYEE_DOC_CATEGORY_ORDER,
  type EmployeeDocCategoryKey,
} from "@/lib/employee/documents/categories";
import type { DocumentsLookups, EmployeeDocumentItem, EmployeeDocumentProfile } from "@/types/documents";
import { cn } from "@/lib/utils";

type Props = {
  profile: EmployeeDocumentProfile;
  lookups: DocumentsLookups;
  permissionCodes: string[];
  selfOnly?: boolean;
};

function BucketCard({
  bucket,
  active,
  onOpen,
}: {
  bucket: EmployeeDocumentBucket;
  active: boolean;
  onOpen: () => void;
}) {
  const meta = CATEGORY_META[bucket.key];
  const Icon = meta.icon;
  const empty = bucket.count === 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex flex-col gap-2.5 rounded-xl border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm",
        empty && "border-dashed bg-muted/10",
        active && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("flex size-11 items-center justify-center rounded-lg", meta.bg)}>
          <Icon className={cn("size-5", meta.text)} />
        </span>
        {empty ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            Not added
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {bucket.count}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight">{bucket.name}</p>
        <p className="truncate text-xs text-muted-foreground">{bucket.description}</p>
      </div>
      <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
        <span>{formatBytes(bucket.storageBytes)}</span>
        <span>{bucket.lastUpdated ? format(parseISO(bucket.lastUpdated), "dd MMM") : "Empty"}</span>
      </div>
    </button>
  );
}

function HrDocumentCard({
  document,
  canEdit,
  canDelete,
  onPreview,
  onDownload,
  onVerify,
  onDelete,
}: {
  document: EmployeeDocumentItem;
  canEdit: boolean;
  canDelete: boolean;
  onPreview: (document: EmployeeDocumentItem) => void;
  onDownload: (document: EmployeeDocumentItem) => void;
  onVerify: (documentId: string, status: "verified" | "rejected") => void;
  onDelete: (document: EmployeeDocumentItem) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <FileThumbnail
          mimeType={document.mimeType}
          fileName={document.fileName}
          className="size-11 shrink-0"
          iconClassName="size-5"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={document.title}>
            {document.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">{document.documentTypeName}</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {document.fileName} · {formatBytes(document.fileSizeBytes)}
          </p>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize">
          {document.documentStatus}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 border-t pt-2">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => onPreview(document)}
          title="Preview"
          aria-label="Preview document"
        >
          <Eye className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => onDownload(document)}
          title="Download"
          aria-label="Download document"
        >
          <Download className="size-4" />
        </Button>
        {canEdit && document.documentStatus === "pending" ? (
          <>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onVerify(document.id, "verified")}
              title="Verify"
              aria-label="Verify document"
            >
              <ShieldCheck className="size-4 text-emerald-600" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onVerify(document.id, "rejected")}
              title="Reject"
              aria-label="Reject document"
            >
              <ShieldX className="size-4 text-destructive" />
            </Button>
          </>
        ) : null}
        {canDelete ? (
          <Button
            size="icon-sm"
            variant="destructive"
            onClick={() => onDelete(document)}
            title="Delete"
            aria-label="Delete document"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function isValidBucketKey(value: string | null): value is EmployeeDocCategoryKey {
  return Boolean(value && EMPLOYEE_DOC_CATEGORY_ORDER.includes(value as EmployeeDocCategoryKey));
}

export function EmployeeDocumentDetailView({
  profile,
  lookups,
  permissionCodes,
  selfOnly = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actions = useDocumentFileActions(() => router.refresh());

  const [selectedBucketKey, setSelectedBucketKey] = useState<EmployeeDocCategoryKey | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadBucketKey, setUploadBucketKey] = useState<EmployeeDocCategoryKey | null>(null);
  const [previewDoc, setPreviewDoc] = useState<EmployeeDocumentItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeDocumentItem | null>(null);

  const canUpload = canUploadDocuments(permissionCodes);
  const canEdit = canEditDocuments(permissionCodes);
  const canDelete = canDeleteDocuments(permissionCodes);

  const group = useMemo<EmployeeDocumentGroup>(
    () => buildEmployeeDocumentGroup(profile),
    [profile],
  );

  useEffect(() => {
    const bucket = searchParams.get("bucket");
    if (isValidBucketKey(bucket)) {
      setSelectedBucketKey(bucket);
    }
  }, [searchParams]);

  const activeBucketMeta = selectedBucketKey
    ? (group.buckets.find((bucket) => bucket.key === selectedBucketKey) ?? null)
    : null;
  const bucketDocuments = selectedBucketKey
    ? documentsForBucket(group.documents, selectedBucketKey)
    : [];

  const availableCount = group.buckets.filter((bucket) => bucket.count > 0).length;
  const missingCount = group.buckets.length - availableCount;

  const uploadDocumentTypes = useMemo(
    () =>
      remainingDocumentTypesForBucket(
        uploadBucketKey,
        group.documents,
        lookups.documentTypes,
      ),
    [uploadBucketKey, group.documents, lookups.documentTypes],
  );

  const defaultDocumentTypeId = useMemo(() => uploadDocumentTypes[0]?.id ?? "", [uploadDocumentTypes]);

  function openUpload(bucketKey?: EmployeeDocCategoryKey | null) {
    setUploadBucketKey(bucketKey ?? selectedBucketKey);
    setUploadOpen(true);
  }

  async function openPreview(document: EmployeeDocumentItem) {
    setPreviewDoc(document);
    setPreviewUrl(null);
    const url = await actions.getSignedUrl(document);
    if (url) setPreviewUrl(url);
    else setPreviewDoc(null);
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link
              href={DOCUMENTS_ROUTES.employeeDocuments}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to employees
            </Link>

            <div className="flex items-start gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CircleUserRound className="size-7" />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight">{group.employeeName}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[group.employeeCode, group.departmentName, group.designationTitle]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
          </div>

          {canUpload ? (
            <Button onClick={() => openUpload(null)}>
              <FileUp className="mr-2 h-4 w-4" />
              Add document
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            {availableCount} available
          </span>
          <span className="rounded-full border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground">
            {missingCount} not added
          </span>
          {group.pendingCount > 0 ? (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              {group.pendingCount} pending verification
            </span>
          ) : null}
        </div>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight">Document buckets</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a bucket to view uploaded files or add what is missing.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.buckets.map((bucket) => {
              const active = selectedBucketKey === bucket.key;
              return (
                <BucketCard
                  key={bucket.key}
                  bucket={bucket}
                  active={active}
                  onOpen={() => setSelectedBucketKey(active ? null : bucket.key)}
                />
              );
            })}
          </div>
        </section>

        {activeBucketMeta ? (
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{activeBucketMeta.name}</h2>
                {activeBucketMeta.count === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Not added yet. Use <span className="font-medium">Add document</span> to upload.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {bucketDocuments.length} document{bucketDocuments.length === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              {canUpload ? (
                <Button size="sm" className="h-9 gap-1.5" onClick={() => openUpload(selectedBucketKey)}>
                  <FileUp className="size-3.5" />
                  Add document
                </Button>
              ) : null}
            </div>

            {bucketDocuments.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {bucketDocuments.map((document) => (
                  <HrDocumentCard
                    key={document.id}
                    document={document}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onPreview={(doc) => void openPreview(doc)}
                    onDownload={(doc) => void actions.download(doc)}
                    onVerify={(documentId, status) => actions.verify(documentId, status)}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <DocumentUploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        lookups={lookups}
        defaultEmployeeId={profile.employeeId}
        replaceDocumentId={null}
        defaultDocumentTypeId={defaultDocumentTypeId}
        defaultTitle=""
        lockEmployee={selfOnly || true}
        documentTypes={uploadDocumentTypes}
      />

      <Modal
        open={Boolean(previewDoc)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewDoc(null);
            setPreviewUrl(null);
          }
        }}
        title={previewDoc?.title ?? "Document Preview"}
        description={
          previewDoc ? `${previewDoc.employeeName} · ${previewDoc.documentTypeName}` : undefined
        }
        contentClassName="sm:max-w-5xl"
        showCancel={false}
        footer={
          previewDoc ? (
            <Button onClick={() => previewDoc && void actions.download(previewDoc)}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          ) : undefined
        }
      >
        <div className="h-[70vh] overflow-hidden rounded-xl border bg-muted/30">
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title={previewDoc?.title ?? "Document preview"}
              className="h-full w-full bg-background"
            />
          ) : (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading preview…
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete document?"
        description="This will archive the document from the employee folder. You can upload a replacement later if needed."
        footer={
          <Button
            variant="destructive"
            disabled={actions.isPending}
            onClick={() => {
              if (!deleteTarget) return;
              actions.archive(deleteTarget.id);
              setDeleteTarget(null);
            }}
          >
            {actions.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete document
          </Button>
        }
      >
        {deleteTarget ? (
          <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <p className="font-medium">{deleteTarget.title}</p>
            <p className="mt-1 text-muted-foreground">
              {deleteTarget.employeeName} · {deleteTarget.fileName}
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
