import type { CandidateDetail, CandidateListItem, OfferListItem } from "@/types/recruitment";

function stubOfferFromListItem(row: CandidateListItem): OfferListItem | null {
  if (!row.latestOfferId) return null;

  return {
    id: row.latestOfferId,
    candidateId: row.id,
    candidateName: row.fullName,
    candidateEmail: row.email,
    jobOpeningId: row.jobOpeningId,
    jobTitle: row.jobTitle,
    departmentId: null,
    departmentName: row.departmentName,
    designationId: null,
    designationTitle: null,
    branchId: null,
    branchName: null,
    employmentTypeId: null,
    employmentTypeName: null,
    reportingManagerId: null,
    reportingManagerName: null,
    salary: 0,
    joiningDate: "",
    offerLetterPath: row.latestOfferLetterPath ?? null,
    offerLetterFileName: row.latestOfferLetterFileName ?? null,
    offerStatus: row.latestOfferStatus ?? "draft",
    expiresAt: null,
    employeeId: row.employeeId,
    notes: null,
    emailSubject: null,
    emailMessage: null,
    createdAt: row.createdAt,
  };
}

/** Instant workspace detail from list row — avoids blank panel while full data loads. */
export function buildOfferWorkspaceDetailFromListItem(
  row: CandidateListItem,
): CandidateDetail {
  const offer = stubOfferFromListItem(row);
  return {
    ...row,
    timeline: [],
    interviews: [],
    offers: offer ? [offer] : [],
    onboardingCaseId: row.inOnboardingList ? undefined : null,
  };
}

export function syncOfferCandidateQueryParam(candidateId: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (candidateId) url.searchParams.set("candidateId", candidateId);
  else url.searchParams.delete("candidateId");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}
