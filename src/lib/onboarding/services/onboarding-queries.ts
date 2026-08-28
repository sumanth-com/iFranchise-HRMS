import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { loadInviteableRoles } from "@/lib/auth/iam-roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCandidateOfferLetter } from "@/lib/onboarding/services/candidate-offer-letter";
import { normalizeOnboardingSectionData } from "@/lib/onboarding/onboarding-personal-field-utils";
import { dedupeOnboardingDocuments } from "@/lib/onboarding/onboarding-correction-utils";
import { ONBOARDING_WIZARD_SECTIONS } from "@/lib/onboarding/constants";
import {
  assignOnboardingRouteRefs,
  isOnboardingCaseUuid,
  resolveOnboardingCaseIdFromRouteRef,
} from "@/lib/onboarding/routing";
import type {
  OnboardingCaseDetail,
  OnboardingCaseListItem,
  OnboardingDashboardStats,
  OnboardingDocumentRecord,
  OnboardingLookups,
  CandidatePortalContext,
  OnboardingStatus,
} from "@/types/onboarding";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

function unwrapName(row: LooseRow | null | undefined, key: string): string | null {
  if (!row) return null;
  const rel = row[key];
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0]?.name ?? rel[0]?.title ?? null;
  return rel.name ?? rel.title ?? null;
}

/** Creates work locations from active branches when none exist yet (common on new orgs). */
async function ensureWorkLocationsFromBranches(organizationId: string): Promise<void> {
  const admin = createAdminClient();

  const { count, error: countError } = await admin
    .schema("hrms")
    .from("work_locations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) return;

  const { data: branches, error: branchError } = await admin
    .schema("hrms")
    .from("branches")
    .select("id, name, location, city")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name");

  if (branchError) throw new Error(branchError.message);
  if (!branches?.length) return;

  for (const branch of branches) {
    const place =
      (branch.location as string | null)?.trim() ||
      (branch.city as string | null)?.trim() ||
      null;
    const name = place && place.toLowerCase() !== branch.name.toLowerCase()
      ? `${branch.name} — ${place}`
      : branch.name;

    const { error } = await admin.schema("hrms").from("work_locations").insert({
      organization_id: organizationId,
      branch_id: branch.id,
      name,
      status: "active",
    });

    if (error && !error.message.includes("duplicate")) {
      throw new Error(error.message);
    }
  }
}

function mapListRow(row: LooseRow): OnboardingCaseListItem {
  return {
    id: row.id,
    fullName: row.full_name,
    personalEmail: row.personal_email,
    mobileNumber: row.mobile_number ?? null,
    status: row.status as OnboardingStatus,
    designationName: unwrapName(row, "designations"),
    departmentName: unwrapName(row, "departments"),
    joiningDate: row.joining_date ?? null,
    completionPercent: row.completion_percent ?? 0,
    intendedRoleName: unwrapName(row, "roles") ?? "—",
    invitationSentAt: row.invitation_sent_at ?? null,
    submittedAt: row.submitted_at ?? null,
    createdAt: row.created_at,
  };
}

export async function getOnboardingLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<OnboardingLookups> {
  await ensureWorkLocationsFromBranches(organizationId);

  const [departments, designations, branches, employmentTypes, workLocations, managers, roles] =
    await Promise.all([
      supabase.schema("hrms").from("departments").select("id, name").eq("organization_id", organizationId).is("deleted_at", null).order("name"),
      supabase.schema("hrms").from("designations").select("id, title").eq("organization_id", organizationId).is("deleted_at", null).order("title"),
      supabase.schema("hrms").from("branches").select("id, name").eq("organization_id", organizationId).is("deleted_at", null).order("name"),
      supabase.schema("hrms").from("employment_types").select("id, name").eq("organization_id", organizationId).is("deleted_at", null).order("name"),
      supabase
        .schema("hrms")
        .from("work_locations")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name"),
      supabase.schema("hrms").from("employees").select("id, first_name, last_name").eq("organization_id", organizationId).eq("employment_status", "active").is("deleted_at", null).order("first_name"),
      loadInviteableRoles(supabase, organizationId),
    ]);

  return {
    departments: (departments.data ?? []).map((r) => ({ id: r.id, name: r.name })),
    designations: (designations.data ?? []).map((r) => ({ id: r.id, title: r.title })),
    branches: (branches.data ?? []).map((r) => ({ id: r.id, name: r.name })),
    employmentTypes: (employmentTypes.data ?? []).map((r) => ({ id: r.id, name: r.name })),
    workLocations: (workLocations.data ?? []).map((r) => ({ id: r.id, name: r.name })),
    managers: (managers.data ?? []).map((r) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`.trim(),
    })),
    roles: roles.map((r) => ({ id: r.id, name: r.name, code: r.code })),
  };
}

export async function getOnboardingDashboardStats(
  supabase: AuthSupabaseClient,
  organizationId: string,
  departmentIds?: string[],
): Promise<OnboardingDashboardStats> {
  const base = () => {
    let query = supabase
      .schema("hrms")
      .from("onboarding_cases")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null);
    if (departmentIds?.length) {
      query = query.in("department_id", departmentIds);
    }
    return query;
  };

  const [totalRes, pendingRes, inProgressRes, completedRes, invitationRes, readyRes] = await Promise.all([
    base(),
    base().eq("status", "pending_hr_review"),
    base().in("status", [
      "in_progress",
      "documents_uploaded",
      "invitation_viewed",
      "corrections_requested",
    ]),
    base().in("status", ["completed", "employee_created"]),
    base().eq("status", "invitation_sent"),
    base().eq("status", "draft"),
  ]);

  const firstError =
    totalRes.error ||
    pendingRes.error ||
    inProgressRes.error ||
    completedRes.error ||
    invitationRes.error ||
    readyRes.error;
  if (firstError) throw new Error(firstError.message);

  return {
    total: totalRes.count ?? 0,
    pendingReview: pendingRes.count ?? 0,
    inProgress: inProgressRes.count ?? 0,
    completed: completedRes.count ?? 0,
    invitationSent: invitationRes.count ?? 0,
    readyForInvitation: readyRes.count ?? 0,
  };
}

export async function listOnboardingDesignationFilters(
  supabase: AuthSupabaseClient,
  organizationId: string,
  departmentIds?: string[],
): Promise<{ id: string; title: string }[]> {
  let query = supabase
    .schema("hrms")
    .from("onboarding_cases")
    .select("designation_id, designations:designation_id (id, title)")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .not("designation_id", "is", null);

  if (departmentIds?.length) query = query.in("department_id", departmentIds);

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const designationId = row.designation_id as string | null;
    const title = unwrapName(row as LooseRow, "designations");
    if (designationId && title) {
      map.set(designationId, title);
    }
  }

  return [...map.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function applyOnboardingListStatusFilter(query: LooseRow, status: string) {
  switch (status) {
    case "ready":
      return query.eq("status", "draft");
    case "in_progress":
      return query.or(
        "and(completion_percent.gt.0,completion_percent.lt.100),status.in.(in_progress,documents_uploaded,corrections_requested,invitation_viewed,pending_hr_review)",
      );
    case "done":
      return query.or(
        "completion_percent.gte.100,status.in.(completed,employee_created,approved)",
      );
    default:
      return query.eq("status", status);
  }
}

function applyJoiningDateFilter(query: LooseRow, joiningYear?: number, joiningMonth?: number) {
  if (!joiningYear) return query;

  if (joiningMonth) {
    const month = String(joiningMonth).padStart(2, "0");
    const lastDay = new Date(joiningYear, joiningMonth, 0).getDate();
    return query
      .gte("joining_date", `${joiningYear}-${month}-01`)
      .lte("joining_date", `${joiningYear}-${month}-${String(lastDay).padStart(2, "0")}`);
  }

  return query
    .gte("joining_date", `${joiningYear}-01-01`)
    .lte("joining_date", `${joiningYear}-12-31`);
}

export async function listOnboardingCases(
  supabase: AuthSupabaseClient,
  organizationId: string,
  params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    designationId?: string;
    joiningMonth?: number;
    joiningYear?: number;
    departmentIds?: string[];
  },
): Promise<{ data: OnboardingCaseListItem[]; total: number }> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .schema("hrms")
    .from("onboarding_cases")
    .select(
      `
        id, full_name, personal_email, mobile_number, status, joining_date,
        completion_percent, invitation_sent_at, submitted_at, created_at,
        designations:designation_id (title),
        departments:department_id (name),
        roles:intended_role_id (name)
      `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status) query = applyOnboardingListStatusFilter(query, params.status);
  if (params.designationId) query = query.eq("designation_id", params.designationId);
  if (params.departmentIds?.length) query = query.in("department_id", params.departmentIds);
  if (params.search) {
    const term = `%${params.search}%`;
    query = query.or(`full_name.ilike.${term},personal_email.ilike.${term}`);
  }
  query = applyJoiningDateFilter(query, params.joiningYear, params.joiningMonth);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []).map((r) => mapListRow(r as LooseRow)), total: count ?? 0 };
}

async function loadCaseDocuments(caseId: string): Promise<OnboardingDocumentRecord[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("onboarding_documents")
    .select("id, document_category, document_type_code, file_name, file_size, review_status, hr_comment, reviewed_at, storage_path")
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .order("created_at");

  if (error) throw new Error(error.message);

  const docs: OnboardingDocumentRecord[] = [];
  for (const row of data ?? []) {
    let signedUrl: string | null = null;
    if (row.storage_path) {
      try {
        const { data: signed, error: signedError } = await admin.storage
          .from("onboarding-documents")
          .createSignedUrl(row.storage_path, 3600);
        if (signedError) {
          console.error("[onboarding] signed url failed", {
            caseId,
            documentId: row.id,
            error: signedError.message,
          });
        } else {
          signedUrl = signed?.signedUrl ?? null;
        }
      } catch (error) {
        console.error("[onboarding] signed url failed", {
          caseId,
          documentId: row.id,
          error: error instanceof Error ? error.message : error,
        });
      }
    }
    docs.push({
      id: row.id,
      documentCategory: row.document_category,
      documentTypeCode: row.document_type_code,
      fileName: row.file_name,
      fileSize: row.file_size ? Number(row.file_size) : null,
      reviewStatus: row.review_status,
      hrComment: row.hr_comment ?? null,
      reviewedAt: row.reviewed_at ?? null,
      signedUrl,
    });
  }
  return dedupeOnboardingDocuments(docs);
}

async function listOnboardingRouteIdentities(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<{ id: string; fullName: string }[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("onboarding_cases")
    .select("id, full_name")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name as string,
  }));
}

export async function resolveOnboardingCaseId(
  supabase: AuthSupabaseClient,
  organizationId: string,
  routeRef: string,
): Promise<string> {
  if (isOnboardingCaseUuid(routeRef)) {
    const { data, error } = await supabase
      .schema("hrms")
      .from("onboarding_cases")
      .select("id")
      .eq("id", routeRef)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Onboarding case not found");
    return data.id;
  }

  const cases = await listOnboardingRouteIdentities(supabase, organizationId);
  const caseId = resolveOnboardingCaseIdFromRouteRef(routeRef, cases);
  if (!caseId) throw new Error("Onboarding case not found");
  return caseId;
}

export async function getOnboardingCaseRouteRef(
  supabase: AuthSupabaseClient,
  organizationId: string,
  caseId: string,
): Promise<string> {
  const cases = await listOnboardingRouteIdentities(supabase, organizationId);
  return assignOnboardingRouteRefs(cases).get(caseId) ?? caseId;
}

export async function getOnboardingCaseDetail(
  supabase: AuthSupabaseClient,
  organizationId: string,
  caseId: string,
): Promise<OnboardingCaseDetail> {
  const { data: row, error } = await supabase
    .schema("hrms")
    .from("onboarding_cases")
    .select(
      `
        *,
        designations:designation_id (title),
        departments:department_id (name),
        roles:intended_role_id (name),
        employment_types:employment_type_id (name),
        branches:branch_id (name),
        work_locations:work_location_id (name),
        manager:reporting_manager_id (first_name, last_name)
      `,
    )
    .eq("id", caseId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("Onboarding case not found");

  const [sections, documents, policies, agreements, signature, timeline] = await Promise.all([
    supabase.schema("hrms").from("onboarding_sections").select("section_key, data, completed_at").eq("case_id", caseId),
    loadCaseDocuments(caseId),
    supabase.schema("hrms").from("onboarding_policy_acknowledgements").select("policy_code").eq("case_id", caseId),
    supabase.schema("hrms").from("onboarding_agreements").select("agreement_type, signed_at, locked_at").eq("case_id", caseId),
    supabase.schema("hrms").from("onboarding_signatures").select("id, signature_type, signature_style, finalized_at").eq("case_id", caseId).order("finalized_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.schema("hrms").from("onboarding_timeline_events").select("id, event_type, title, description, occurred_at").eq("case_id", caseId).order("occurred_at", { ascending: false }).limit(50),
  ]);

  const manager = row.manager as { first_name?: string; last_name?: string } | null;
  const base = mapListRow(row as LooseRow);

  return {
    ...base,
    organizationId: row.organization_id,
    reportingManagerName: manager ? `${manager.first_name ?? ""} ${manager.last_name ?? ""}`.trim() : null,
    employmentTypeName: unwrapName(row as LooseRow, "employment_types"),
    workLocationName: unwrapName(row as LooseRow, "work_locations"),
    branchName: unwrapName(row as LooseRow, "branches"),
    employmentCategory: row.employment_category ?? null,
    offerReferenceNumber: row.offer_reference_number ?? null,
    intendedRoleId: row.intended_role_id,
    employeeId: row.employee_id ?? null,
    companyEmail: row.company_email ?? null,
    employeeCode: row.employee_code ?? null,
    hrComments: row.hr_comments ?? null,
    correctionNotes: row.correction_notes ?? null,
    sections: (sections.data ?? []).map((s) => ({
      sectionKey: s.section_key,
      data: normalizeOnboardingSectionData(s.data),
      completedAt: s.completed_at ?? null,
    })),
    documents,
    policyAcknowledgements: (policies.data ?? []).map((p) => p.policy_code),
    agreements: (agreements.data ?? []).map((a) => ({
      agreementType: a.agreement_type,
      signedAt: a.signed_at ?? null,
      lockedAt: a.locked_at ?? null,
    })),
    signature: signature.data
      ? {
          id: signature.data.id,
          signatureType: signature.data.signature_type,
          signatureStyle: signature.data.signature_style ?? null,
          finalizedAt: signature.data.finalized_at,
        }
      : null,
    timeline: (timeline.data ?? []).map((t) => ({
      id: t.id,
      eventType: t.event_type,
      title: t.title,
      description: t.description ?? null,
      occurredAt: t.occurred_at,
    })),
  };
}

export async function getCandidatePortalContext(caseId: string): Promise<CandidatePortalContext | null> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .select(
      "id, organization_id, full_name, personal_email, offer_reference_number, status, completion_percent, joining_date, correction_notes, onboarding_account_active, deleted_at, submitted_at",
    )
    .eq("id", caseId)
    .maybeSingle();

  if (error || !row || row.deleted_at || !row.onboarding_account_active) return null;

  const [sections, documentsRaw, policies, agreements, signature] = await Promise.all([
    admin.schema("hrms").from("onboarding_sections").select("section_key, data, completed_at").eq("case_id", caseId),
    loadCaseDocuments(caseId),
    admin.schema("hrms").from("onboarding_policy_acknowledgements").select("policy_code").eq("case_id", caseId),
    admin.schema("hrms").from("onboarding_agreements").select("agreement_type, signed_at, locked_at").eq("case_id", caseId),
    admin.schema("hrms").from("onboarding_signatures").select("id, signature_type, signature_style, finalized_at").eq("case_id", caseId).order("finalized_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const documents = documentsRaw;
  const hasOpenCorrections =
    row.status === "corrections_requested" ||
    documents.some((doc) => doc.reviewStatus === "correction_requested");
  const locked =
    ["approved", "employee_created", "completed", "rejected", "cancelled", "archived"].includes(
      row.status as string,
    ) ||
    (row.status === "pending_hr_review" && !hasOpenCorrections);

  let offerLetter: CandidatePortalContext["offerLetter"] = null;
  try {
    const offerLetterRecord = await loadCandidateOfferLetter(
      row.organization_id as string,
      (row.offer_reference_number as string | null) ?? null,
      row.personal_email as string,
    );
    offerLetter = offerLetterRecord
      ? {
          fileName: offerLetterRecord.fileName,
          uploadedAt: offerLetterRecord.uploadedAt,
          contentType: offerLetterRecord.contentType,
        }
      : null;
  } catch (error) {
    console.error("[onboarding] offer letter lookup failed", {
      caseId,
      error: error instanceof Error ? error.message : error,
    });
  }

  return {
    caseId: row.id,
    fullName: row.full_name,
    personalEmail: row.personal_email,
    status: row.status,
    completionPercent: row.completion_percent ?? 0,
    joiningDate: row.joining_date ?? null,
    correctionNotes: row.correction_notes ?? null,
    locked,
    sections: (sections.data ?? []).map((s) => ({
      sectionKey: s.section_key,
      data: normalizeOnboardingSectionData(s.data),
      completedAt: s.completed_at ?? null,
    })),
    documents,
    policyAcknowledgements: (policies.data ?? []).map((p) => p.policy_code),
    agreements: (agreements.data ?? []).map((a) => ({
      agreementType: a.agreement_type,
      signedAt: a.signed_at ?? null,
      lockedAt: a.locked_at ?? null,
    })),
    signature: signature.data
      ? {
          id: signature.data.id,
          signatureType: signature.data.signature_type,
          signatureStyle: signature.data.signature_style ?? null,
          finalizedAt: signature.data.finalized_at,
        }
      : null,
    offerLetter,
  };
}

export function calculateCompletionPercent(
  sections: { sectionKey: string; completedAt: string | null }[],
  documentsCount: number,
  policyCount: number,
  agreementCount: number,
  hasSignature: boolean,
): number {
  const sectionWeight = 60;
  const docWeight = 15;
  const policyWeight = 10;
  const agreementWeight = 10;
  const signatureWeight = 5;

  const completedSections = sections.filter((s) => s.completedAt).length;
  const sectionScore =
    ONBOARDING_WIZARD_SECTIONS.length > 0
      ? (completedSections / ONBOARDING_WIZARD_SECTIONS.length) * sectionWeight
      : 0;
  const docScore = documentsCount > 0 ? docWeight : 0;
  const policyScore = policyCount >= 7 ? policyWeight : (policyCount / 7) * policyWeight;
  const agreementScore = agreementCount >= 6 ? agreementWeight : (agreementCount / 6) * agreementWeight;
  const sigScore = hasSignature ? signatureWeight : 0;

  return Math.min(100, Math.round(sectionScore + docScore + policyScore + agreementScore + sigScore));
}
