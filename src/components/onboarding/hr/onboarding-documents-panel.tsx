"use client";

import { ExternalLink, FileText } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  educationDocumentTypeCode,
  educationLevelLabel,
  parseEducationEntries,
} from "@/lib/onboarding/education-utils";
import {
  ONBOARDING_DOCUMENT_CATEGORY_LABELS,
  ONBOARDING_EMPLOYMENT_DOCUMENTS,
  ONBOARDING_IDENTITY_DOCUMENTS,
  type OnboardingDocumentRecord,
} from "@/types/onboarding";

const DOCUMENT_REVIEW_LABELS: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  correction_requested: "Correction requested",
};

const REVIEW_STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-900",
  correction_requested: "bg-orange-100 text-orange-900",
};

function catalogLabel(category: string, typeCode: string): string {
  if (category === "identity") {
    const match = ONBOARDING_IDENTITY_DOCUMENTS.find((d) => d.code === typeCode);
    if (match) return match.label;
  }
  if (category === "employment") {
    const match = ONBOARDING_EMPLOYMENT_DOCUMENTS.find((d) => d.code === typeCode);
    if (match) return match.label;
  }
  if (category === "bank" && typeCode === "cancelled_cheque") return "Cancelled cheque";
  if (category === "education" && typeCode.startsWith("edu_")) {
    return "Education certificate";
  }
  return typeCode.replace(/_/g, " ");
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
  const educationEntries = educationSectionData ? parseEducationEntries(educationSectionData) : [];

  const grouped = new Map<string, OnboardingDocumentRecord[]>();
  for (const doc of documents) {
    const list = grouped.get(doc.documentCategory) ?? [];
    list.push(doc);
    grouped.set(doc.documentCategory, list);
  }

  const categoryOrder = ["identity", "education", "employment", "bank"];

  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No documents yet. They will appear here when the candidate uploads files in the
        onboarding portal.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {categoryOrder.map((category) => {
        const items = grouped.get(category);
        if (!items?.length) return null;

        return (
          <div key={category} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {ONBOARDING_DOCUMENT_CATEGORY_LABELS[category] ?? category}
            </h3>
            <div className="space-y-2">
              {items.map((doc) => {
                const eduEntry = educationEntries.find(
                  (e) => educationDocumentTypeCode(e.id) === doc.documentTypeCode,
                );
                const title = eduEntry
                  ? `${educationLevelLabel(eduEntry.level)} — ${eduEntry.institutionName}`
                  : catalogLabel(doc.documentCategory, doc.documentTypeCode);

                return (
                  <div
                    key={doc.id}
                    className="rounded-xl border bg-muted/10 p-3 sm:p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm leading-snug">{title}</p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {doc.fileName}
                            </p>
                            <span
                              className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${REVIEW_STATUS_CLASS[doc.reviewStatus] ?? "bg-muted text-muted-foreground"}`}
                            >
                              {DOCUMENT_REVIEW_LABELS[doc.reviewStatus] ?? doc.reviewStatus}
                            </span>
                          </div>
                        </div>
                        {doc.signedUrl ? (
                          <a
                            href={doc.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open document
                          </a>
                        ) : null}
                      </div>
                      {canReview ? (
                        <div className="flex flex-wrap gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onReview(doc.id, "approved")}
                            disabled={isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onReview(doc.id, "correction_requested")}
                            disabled={isPending}
                          >
                            Request fix
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onReview(doc.id, "rejected")}
                            disabled={isPending}
                          >
                            Reject
                          </Button>
                        </div>
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
  );
}
