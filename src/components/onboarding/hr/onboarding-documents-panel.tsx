"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  educationDocumentLabel,
  educationDocumentTypeCode,
  educationLevelLabel,
  parseEducationEntries,
} from "@/lib/onboarding/education-utils";
import { employmentDocumentLabel } from "@/lib/onboarding/employment-utils";
import {
  ONBOARDING_DOCUMENT_CATEGORY_LABELS,
  ONBOARDING_EMPLOYMENT_DOCUMENTS,
  ONBOARDING_IDENTITY_DOCUMENTS,
  type OnboardingDocumentRecord,
} from "@/types/onboarding";
import { cn } from "@/lib/utils";

const DOCUMENT_REVIEW_LABELS: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  correction_requested: "Correction requested",
};

const REVIEW_STATUS_CLASS: Record<string, string> = {
  pending:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-500/30",
  approved:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30",
  rejected:
    "bg-red-50 text-red-700 ring-1 ring-red-600/20 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-500/30",
  correction_requested:
    "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-500/30",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "approved") return <CheckCircle2 className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />;
  if (status === "rejected") return <XCircle className="size-3 shrink-0 text-red-600 dark:text-red-400" />;
  if (status === "correction_requested") return <AlertCircle className="size-3 shrink-0 text-orange-600 dark:text-orange-400" />;
  return <Clock className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />;
}

function catalogLabel(category: string, typeCode: string): string {
  if (category === "identity") {
    const match = ONBOARDING_IDENTITY_DOCUMENTS.find((d) => d.code === typeCode);
    if (match) return match.label;
  }
  if (category === "employment") {
    if (typeCode.startsWith("emp_")) return employmentDocumentLabel(typeCode);
    const match = ONBOARDING_EMPLOYMENT_DOCUMENTS.find((d) => d.code === typeCode);
    if (match) return match.label;
  }
  if (category === "bank" && typeCode === "cancelled_cheque") return "Cancelled Cheque";
  if (category === "education" && typeCode.startsWith("edu_")) {
    return educationDocumentLabel(typeCode);
  }
  return typeCode.replace(/_/g, " ");
}

function isPdfFile(fileName?: string | null): boolean {
  if (!fileName) return false;
  return fileName.toLowerCase().endsWith(".pdf");
}

function isImageFile(fileName?: string | null): boolean {
  if (!fileName) return false;
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".bmp") ||
    lower.endsWith(".svg")
  );
}

type OnboardingDocumentsPanelProps = {
  documents: OnboardingDocumentRecord[];
  educationSectionData?: Record<string, unknown>;
  canReview: boolean;
  isPending: boolean;
  onReview: (
    documentId: string,
    status: "approved" | "rejected" | "correction_requested",
  ) => void;
};

export function OnboardingDocumentsPanel({
  documents,
  educationSectionData,
  canReview,
  isPending,
  onReview,
}: OnboardingDocumentsPanelProps) {
  const [previewDoc, setPreviewDoc] = useState<OnboardingDocumentRecord | null>(null);

  const educationEntries = educationSectionData ? parseEducationEntries(educationSectionData) : [];

  const grouped = new Map<string, OnboardingDocumentRecord[]>();
  for (const doc of documents) {
    const list = grouped.get(doc.documentCategory) ?? [];
    list.push(doc);
    grouped.set(doc.documentCategory, list);
  }

  const defaultCategoryOrder = ["identity", "education", "employment", "bank", "offer_acceptance"];
  const presentCategories = Array.from(grouped.keys());
  const sortedCategories = [
    ...defaultCategoryOrder.filter((c) => presentCategories.includes(c)),
    ...presentCategories.filter((c) => !defaultCategoryOrder.includes(c)),
  ];

  // Keep modal in sync when document status updates via parent props
  useEffect(() => {
    if (previewDoc) {
      const updated = documents.find((d) => d.id === previewDoc.id);
      if (updated && updated.reviewStatus !== previewDoc.reviewStatus) {
        setPreviewDoc(updated);
      }
    }
  }, [documents, previewDoc]);

  function getDocumentTitle(doc: OnboardingDocumentRecord): string {
    const eduEntry = educationEntries.find(
      (e) => educationDocumentTypeCode(e.id) === doc.documentTypeCode,
    );
    return eduEntry
      ? `${educationLevelLabel(eduEntry.level)} — ${eduEntry.institutionName}`
      : catalogLabel(doc.documentCategory, doc.documentTypeCode);
  }

  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No documents yet. They will appear here when the candidate uploads files in the
        onboarding portal.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {sortedCategories.map((category) => {
          const items = grouped.get(category);
          if (!items?.length) return null;

          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {ONBOARDING_DOCUMENT_CATEGORY_LABELS[category] ?? category.replace(/_/g, " ")}
                </h3>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {items.length} {items.length === 1 ? "document" : "documents"}
                </span>
              </div>

              {/* 3 items in one row on desktop */}
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                {items.map((doc) => {
                  const title = getDocumentTitle(doc);

                  return (
                    <div
                      key={doc.id}
                      className="group flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"
                    >
                      <div>
                        {/* Title and file name */}
                        <div className="flex items-start gap-3">
                          <div
                            onClick={() => doc.signedUrl && setPreviewDoc(doc)}
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-primary transition-colors",
                              doc.signedUrl && "cursor-pointer group-hover:border-primary/50 group-hover:bg-primary/10",
                            )}
                          >
                            <FileText className="size-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "line-clamp-1 text-sm font-semibold leading-snug text-foreground",
                                doc.signedUrl && "cursor-pointer hover:text-primary",
                              )}
                              title={title}
                              onClick={() => doc.signedUrl && setPreviewDoc(doc)}
                            >
                              {title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                              REVIEW_STATUS_CLASS[doc.reviewStatus] ?? "bg-muted text-muted-foreground",
                            )}
                          >
                            <StatusIcon status={doc.reviewStatus} />
                            {DOCUMENT_REVIEW_LABELS[doc.reviewStatus] ?? doc.reviewStatus}
                          </span>
                        </div>
                      </div>

                      {/* Actions in ONE line: View, Approve, Request fix (no Reject) */}
                      <div className="mt-3 flex items-center gap-1.5 border-t border-border/50 pt-2.5">
                        {doc.signedUrl ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 flex-1 px-2 text-xs font-medium hover:bg-muted"
                            onClick={() => setPreviewDoc(doc)}
                          >
                            <Eye className="mr-1 size-3.5" />
                            View
                          </Button>
                        ) : null}

                        {canReview ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className={cn(
                                "h-8 flex-1 px-2 text-xs font-medium transition-colors",
                                doc.reviewStatus === "approved"
                                  ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-800 ring-1 ring-emerald-600/30 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "hover:border-emerald-400 hover:bg-emerald-50/70 hover:text-emerald-700 dark:hover:bg-emerald-950/30",
                              )}
                              onClick={() => onReview(doc.id, "approved")}
                              disabled={isPending}
                            >
                              <Check className="mr-1 size-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={cn(
                                "h-8 flex-1 px-2 text-xs font-medium transition-colors",
                                doc.reviewStatus === "correction_requested"
                                  ? "border-amber-600 bg-amber-50 font-semibold text-amber-800 ring-1 ring-amber-600/30 dark:bg-amber-950/50 dark:text-amber-300"
                                  : "hover:border-amber-400 hover:bg-amber-50/70 hover:text-amber-800 dark:hover:bg-amber-950/30",
                              )}
                              onClick={() => onReview(doc.id, "correction_requested")}
                              disabled={isPending}
                            >
                              <AlertCircle className="mr-1 size-3.5" />
                              Request fix
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* In-page Document Popup Preview Modal (Clean document view only: no download/open in tab/action buttons) */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="flex max-h-[92vh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b px-5 py-3.5 pr-12 text-left space-y-0.5">
            <DialogTitle className="truncate text-base font-semibold text-foreground">
              {previewDoc ? getDocumentTitle(previewDoc) : "Document preview"}
            </DialogTitle>
            <DialogDescription className="truncate text-xs text-muted-foreground">
              {previewDoc?.fileName}
            </DialogDescription>
          </DialogHeader>

          <div className="relative flex min-h-[60vh] max-h-[74vh] flex-1 items-center justify-center overflow-auto bg-muted/20 p-2 sm:p-4">
            {previewDoc?.signedUrl ? (
              isPdfFile(previewDoc.fileName) ? (
                <object
                  data={`${previewDoc.signedUrl}#toolbar=1&navpanes=0`}
                  type="application/pdf"
                  className="h-[70vh] w-full rounded-lg border bg-background shadow-xs"
                >
                  <iframe
                    src={`${previewDoc.signedUrl}#toolbar=1&navpanes=0`}
                    title={previewDoc.fileName}
                    className="h-[70vh] w-full rounded-lg border bg-background shadow-xs"
                  />
                </object>
              ) : isImageFile(previewDoc.fileName) ? (
                <div className="flex max-h-full max-w-full items-center justify-center p-2">
                  <img
                    src={previewDoc.signedUrl}
                    alt={previewDoc.fileName}
                    className="max-h-[68vh] max-w-full rounded-lg border bg-background object-contain shadow-sm"
                  />
                </div>
              ) : (
                <iframe
                  src={previewDoc.signedUrl}
                  title={previewDoc.fileName}
                  className="h-[70vh] w-full rounded-lg border bg-background shadow-xs"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                <FileText className="size-12 text-muted-foreground/50" />
                <p className="font-medium text-foreground">Document not available</p>
                <p className="text-xs">No file attached to this record.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
