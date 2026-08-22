import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import { allocateNextEmployeeCode } from "@/lib/employees/services/employee-code";
import { activateEmployeeAccountFromOnboarding } from "@/lib/employees/services/employee-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/mailer";
import { siteConfig } from "@/config/site";
import {
  onboardingInviteUrl,
  ONBOARDING_ROUTES,
  ONBOARDING_STORAGE_BUCKET,
} from "@/lib/onboarding/constants";
import {
  renderOnboardingAccountReadyEmail,
  renderOnboardingCorrectionsEmail,
  renderOnboardingInvitationEmail,
} from "@/lib/onboarding/email-templates";
import {
  addTimelineEvent,
  createOnboardingInvitationToken,
  ensurePortalAccountForInvitation,
  hashOnboardingToken,
  revokeActiveInvitationTokens,
  revokeActiveInvitationTokensExcept,
  revokePortalSessions,
  getOnboardingPortalAuthUserId,
} from "@/lib/onboarding/onboarding-security";
import {
  calculateCompletionPercent,
  getOnboardingCaseDetail,
} from "@/lib/onboarding/services/onboarding-queries";
import { syncOnboardingDataToEmployee } from "@/lib/onboarding/services/onboarding-employee-sync";
import type { createOnboardingCaseFormSchema } from "@/lib/validations/onboarding";
import type { z } from "zod";

type CreateInput = z.infer<typeof createOnboardingCaseFormSchema>;

const ONBOARDING_RESENDABLE_STATUSES = [
  "draft",
  "invitation_sent",
  "invitation_viewed",
  "in_progress",
  "documents_uploaded",
  "corrections_requested",
  "cancelled",
] as const;

const ONBOARDING_BLOCKED_DUPLICATE_STATUSES = [
  "pending_hr_review",
  "approved",
  "employee_created",
] as const;

function parseFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "New";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "Hire";
  return { firstName, lastName };
}

export async function generateCompanyEmail(
  supabase: AuthSupabaseClient,
  organizationId: string,
  firstName: string,
  lastName: string,
): Promise<string> {
  const { data: org } = await supabase
    .schema("hrms")
    .from("organizations")
    .select("name, registered_email")
    .eq("id", organizationId)
    .maybeSingle();

  let domain = "company.com";
  if (org?.registered_email?.includes("@")) {
    domain = org.registered_email.split("@")[1] ?? domain;
  } else if (org?.name) {
    domain = `${org.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
  }

  const base = `${firstName.toLowerCase().replace(/[^a-z]/g, "")}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}`;
  const admin = createAdminClient();

  for (let i = 0; i < 20; i++) {
    const suffix = i === 0 ? "" : String(i);
    const candidate = `${base}${suffix}@${domain}`;
    const { count } = await admin
      .schema("hrms")
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .ilike("email", candidate)
      .is("deleted_at", null);
    if ((count ?? 0) === 0) return candidate;
  }

  return `${base}${Date.now().toString(36)}@${domain}`;
}

async function resolveOnboardingBranchId(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<string> {
  if (profile.employee.branchId) return profile.employee.branchId;

  const { data, error } = await supabase
    .schema("hrms")
    .from("branches")
    .select("id")
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .order("name")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("No branch is configured for this organization");
  return data.id;
}

async function resolveDefaultEmployeeRoleId(organizationId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: roles, error } = await admin
    .schema("hrms")
    .from("roles")
    .select("id, code, name, portal_key, is_default")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const list = roles ?? [];
  const match =
    list.find((role) => String(role.code ?? "").toLowerCase() === "employee") ??
    list.find((role) => String(role.portal_key ?? "").toLowerCase() === "employee") ??
    list.find((role) => role.is_default === true && String(role.code ?? "").toLowerCase() !== "super_admin") ??
    list.find((role) => String(role.code ?? "").toLowerCase() !== "super_admin");

  if (!match?.id) {
    throw new Error("No active role is configured for new hires.");
  }
  return match.id;
}

async function refreshCompletionPercent(caseId: string) {
  const admin = createAdminClient();
  const [sections, docs, policies, agreements] = await Promise.all([
    admin.schema("hrms").from("onboarding_sections").select("section_key, completed_at").eq("case_id", caseId),
    admin.schema("hrms").from("onboarding_documents").select("id", { count: "exact", head: true }).eq("case_id", caseId).is("deleted_at", null),
    admin.schema("hrms").from("onboarding_policy_acknowledgements").select("policy_code", { count: "exact", head: true }).eq("case_id", caseId),
    admin.schema("hrms").from("onboarding_agreements").select("agreement_type", { count: "exact", head: true }).eq("case_id", caseId),
  ]);

  const signatureSectionComplete = (sections.data ?? []).some(
    (section) => section.section_key === "signature" && section.completed_at,
  );

  const completionPercent = calculateCompletionPercent(
    (sections.data ?? []).map((s) => ({ sectionKey: s.section_key, completedAt: s.completed_at })),
    docs.count ?? 0,
    policies.count ?? 0,
    agreements.count ?? 0,
    signatureSectionComplete,
  );

  await admin
    .schema("hrms")
    .from("onboarding_cases")
    .update({ completion_percent: completionPercent, updated_at: new Date().toISOString() })
    .eq("id", caseId);

  return completionPercent;
}

export async function createOnboardingCase(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: CreateInput,
): Promise<string> {
  const organizationId = profile.employee.organizationId;
  const branchId = await resolveOnboardingBranchId(supabase, profile);
  const intendedRoleId = await resolveDefaultEmployeeRoleId(organizationId);

  const { data, error } = await supabase
    .schema("hrms")
    .from("onboarding_cases")
    .insert({
      organization_id: organizationId,
      status: "draft",
      full_name: input.fullName.trim(),
      personal_email: input.personalEmail.trim().toLowerCase(),
      mobile_number: input.mobileNumber?.trim() ?? null,
      designation_id: input.designationId,
      department_id: input.departmentId,
      reporting_manager_id: input.reportingManagerId ?? null,
      employment_type_id: input.employmentTypeId,
      joining_date: input.joiningDate,
      work_location_id: input.workLocationId ?? null,
      branch_id: branchId,
      employment_category: input.employmentCategory?.trim() ?? null,
      offer_reference_number: input.offerReferenceNumber?.trim() ?? null,
      intended_role_id: intendedRoleId,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("onboarding_cases_org_personal_email_active_idx")) {
      throw new Error(
        `An active onboarding case already exists for ${input.personalEmail.trim().toLowerCase()}. Open it from the list or use a different email.`,
      );
    }
    throw new Error(error.message);
  }

  await addTimelineEvent(supabase, data.id, {
    eventType: "case_created",
    title: "New hire record created",
    description: `${input.fullName} added for onboarding`,
    actorUserId: profile.userId,
  });

  await writeApplicationAudit(supabase, {
    organizationId,
    module: "onboarding",
    action: "create",
    description: `Onboarding case created for ${input.fullName}`,
    recordId: data.id,
  });

  return data.id;
}

async function findOnboardingCaseByEmail(
  supabase: AuthSupabaseClient,
  organizationId: string,
  personalEmail: string,
) {
  const email = personalEmail.trim().toLowerCase();
  const { data, error } = await supabase
    .schema("hrms")
    .from("onboarding_cases")
    .select("id, status, deleted_at")
    .eq("organization_id", organizationId)
    .eq("personal_email", email)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

const ONBOARDING_TERMINAL_STATUSES = ["cancelled", "archived", "rejected", "completed"] as const;

function isDuplicateOnboardingEmailError(error: { message?: string; code?: string }): boolean {
  if (error.code === "23505") return true;
  const message = error.message ?? "";
  return (
    message.includes("onboarding_cases_org_personal_email_active_idx") ||
    message.includes("duplicate key")
  );
}

async function findActiveOnboardingCaseByEmailAdmin(
  organizationId: string,
  personalEmail: string,
) {
  const admin = createAdminClient();
  const email = personalEmail.trim().toLowerCase();
  const { data, error } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .select("id, status, deleted_at")
    .eq("organization_id", organizationId)
    .eq("personal_email", email)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  if (
    ONBOARDING_TERMINAL_STATUSES.includes(
      data.status as (typeof ONBOARDING_TERMINAL_STATUSES)[number],
    )
  ) {
    return null;
  }
  return data;
}

type OfferOnboardingSyncInput = {
  fullName: string;
  personalEmail: string;
  mobileNumber?: string | null;
  designationId?: string | null;
  departmentId?: string | null;
  reportingManagerId?: string | null;
  employmentTypeId?: string | null;
  joiningDate?: string | null;
  offerReferenceNumber?: string | null;
};

async function updateOnboardingCaseFromOfferAdmin(
  organizationId: string,
  caseId: string,
  profile: UserProfile,
  input: OfferOnboardingSyncInput,
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .update({
      full_name: input.fullName.trim(),
      personal_email: input.personalEmail.trim().toLowerCase(),
      mobile_number: input.mobileNumber?.trim() || null,
      designation_id: input.designationId || null,
      department_id: input.departmentId || null,
      reporting_manager_id: input.reportingManagerId || null,
      employment_type_id: input.employmentTypeId || null,
      joining_date: input.joiningDate || null,
      offer_reference_number: input.offerReferenceNumber?.trim() || null,
      updated_by: profile.userId,
      updated_at: now,
    })
    .eq("id", caseId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
}

/** RLS hides soft-deleted rows from the auth client; use admin for dismiss checks. */
async function hasHrDismissedOnboardingByEmail(
  organizationId: string,
  personalEmail: string,
): Promise<boolean> {
  const email = personalEmail.trim().toLowerCase();
  if (!email) return false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("personal_email", email)
    .not("deleted_at", "is", null)
    .limit(1);

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

/**
 * When HR deleted onboarding for an email, block offer-sync from recreating it.
 * Also soft-deletes any active duplicate rows that may have been created before this guard.
 */
async function applyOnboardingDismissalGuard(
  organizationId: string,
  personalEmail: string,
  actorUserId: string,
): Promise<boolean> {
  const dismissed = await hasHrDismissedOnboardingByEmail(organizationId, personalEmail);
  if (!dismissed) return false;

  const email = personalEmail.trim().toLowerCase();
  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .update({
      deleted_at: now,
      onboarding_account_active: false,
      updated_by: actorUserId,
      updated_at: now,
    })
    .eq("organization_id", organizationId)
    .eq("personal_email", email)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return true;
}

async function findActiveOnboardingCaseByEmail(
  supabase: AuthSupabaseClient,
  organizationId: string,
  personalEmail: string,
) {
  const data = await findOnboardingCaseByEmail(supabase, organizationId, personalEmail);
  if (!data) return null;
  if (["cancelled", "archived", "rejected", "completed"].includes(data.status as string)) {
    return null;
  }
  return data;
}

async function updateOnboardingCaseFromForm(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  caseId: string,
  input: CreateInput,
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .schema("hrms")
    .from("onboarding_cases")
    .update({
      full_name: input.fullName.trim(),
      personal_email: input.personalEmail.trim().toLowerCase(),
      mobile_number: input.mobileNumber?.trim() ?? null,
      designation_id: input.designationId,
      department_id: input.departmentId,
      reporting_manager_id: input.reportingManagerId ?? null,
      employment_type_id: input.employmentTypeId,
      joining_date: input.joiningDate,
      work_location_id: input.workLocationId ?? null,
      employment_category: input.employmentCategory?.trim() ?? null,
      offer_reference_number: input.offerReferenceNumber?.trim() ?? null,
      updated_by: profile.userId,
      updated_at: now,
    })
    .eq("id", caseId);

  if (error) throw new Error(error.message);

  await addTimelineEvent(supabase, caseId, {
    eventType: "case_updated",
    title: "Onboarding details updated",
    description: `Details refreshed before sending invitation to ${input.fullName}`,
    actorUserId: profile.userId,
  });
}

export async function createOrUpdateOnboardingCaseForInvite(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: CreateInput,
): Promise<{ caseId: string; resent: boolean }> {
  const organizationId = profile.employee.organizationId;
  const email = input.personalEmail.trim().toLowerCase();
  const existing = await findActiveOnboardingCaseByEmail(supabase, organizationId, email);

  if (existing) {
    if (
      ONBOARDING_BLOCKED_DUPLICATE_STATUSES.includes(
        existing.status as (typeof ONBOARDING_BLOCKED_DUPLICATE_STATUSES)[number],
      )
    ) {
      throw new Error(
        `An active onboarding case already exists for ${email}. Open it from the onboarding list to continue.`,
      );
    }

    if (
      !ONBOARDING_RESENDABLE_STATUSES.includes(
        existing.status as (typeof ONBOARDING_RESENDABLE_STATUSES)[number],
      )
    ) {
      throw new Error(
        `Cannot create a new invitation for ${email}. The existing case status is "${existing.status}".`,
      );
    }

    await updateOnboardingCaseFromForm(supabase, profile, existing.id, input);
    return { caseId: existing.id, resent: true };
  }

  const caseId = await createOnboardingCase(supabase, profile, input);
  return { caseId, resent: false };
}

export async function ensureOnboardingCaseFromOffer(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: OfferOnboardingSyncInput,
): Promise<string> {
  const organizationId = profile.employee.organizationId;
  const email = input.personalEmail?.trim().toLowerCase() ?? "";
  const fullName = input.fullName.trim();
  if (!email) {
    throw new Error("Candidate email is required to add them to onboarding.");
  }
  if (!fullName) {
    throw new Error("Candidate name is required to add them to onboarding.");
  }

  if (await applyOnboardingDismissalGuard(organizationId, email, profile.userId)) {
    throw new Error(
      `Onboarding was previously removed for ${email}. Restore the case or contact support before uploading an offer letter.`,
    );
  }

  const syncInput: OfferOnboardingSyncInput = { ...input, fullName, personalEmail: email };

  const existing = await findActiveOnboardingCaseByEmailAdmin(organizationId, email);
  if (existing) {
    await updateOnboardingCaseFromOfferAdmin(organizationId, existing.id, profile, syncInput);
    return existing.id;
  }

  const branchId = await resolveOnboardingBranchId(supabase, profile);
  const intendedRoleId = await resolveDefaultEmployeeRoleId(organizationId);
  const admin = createAdminClient();

  const { data, error } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .insert({
      organization_id: organizationId,
      status: "draft",
      full_name: fullName,
      personal_email: email,
      mobile_number: input.mobileNumber?.trim() || null,
      designation_id: input.designationId || null,
      department_id: input.departmentId || null,
      reporting_manager_id: input.reportingManagerId || null,
      employment_type_id: input.employmentTypeId || null,
      joining_date: input.joiningDate || null,
      branch_id: branchId,
      offer_reference_number: input.offerReferenceNumber?.trim() || null,
      intended_role_id: intendedRoleId,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) {
    if (isDuplicateOnboardingEmailError(error)) {
      const duplicate = await findActiveOnboardingCaseByEmailAdmin(organizationId, email);
      if (duplicate?.id) {
        await updateOnboardingCaseFromOfferAdmin(
          organizationId,
          duplicate.id,
          profile,
          syncInput,
        );
        return duplicate.id;
      }
    }
    throw new Error(error.message);
  }

  await addTimelineEvent(supabase, data.id, {
    eventType: "case_created",
    title: "Ready for onboarding",
    description: `${fullName} added after offer letter was uploaded`,
    actorUserId: profile.userId,
  });

  return data.id;
}

export async function syncOnboardingCasesFromSentOffers(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<void> {
  const organizationId = profile.employee.organizationId;
  const { data: offers, error } = await supabase
    .schema("hrms")
    .from("recruitment_offers")
    .select(
      `offer_code, joining_date, reporting_manager_id,
      candidate:candidate_id(first_name, last_name, email, phone),
      job:job_opening_id(title, department_id, designation_id, employment_type_id, hiring_manager_id)`,
    )
    .eq("organization_id", organizationId)
    .not("offer_letter_path", "is", null)
    .in("offer_status", ["draft", "sent", "accepted"])
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  for (const offer of offers ?? []) {
    const candidate = Array.isArray(offer.candidate) ? offer.candidate[0] : offer.candidate;
    const job = Array.isArray(offer.job) ? offer.job[0] : offer.job;
    if (!candidate?.email) continue;

    const fullName = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ").trim();
    try {
      await ensureOnboardingCaseFromOffer(supabase, profile, {
        fullName: fullName || candidate.email,
        personalEmail: candidate.email,
        mobileNumber: candidate.phone ?? null,
        designationId: job?.designation_id ?? null,
        departmentId: job?.department_id ?? null,
        reportingManagerId: offer.reporting_manager_id ?? job?.hiring_manager_id ?? null,
        employmentTypeId: job?.employment_type_id ?? null,
        joiningDate: offer.joining_date ?? null,
        offerReferenceNumber: offer.offer_code ?? null,
      });
    } catch (error) {
      console.error(
        "[onboarding] failed to add sent offer to onboarding",
        candidate.email,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

export async function sendOnboardingInvitation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  caseId: string,
): Promise<void> {
  const organizationId = profile.employee.organizationId;
  const detail = await getOnboardingCaseDetail(supabase, organizationId, caseId);
  if (
    !ONBOARDING_RESENDABLE_STATUSES.includes(
      detail.status as (typeof ONBOARDING_RESENDABLE_STATUSES)[number],
    )
  ) {
    throw new Error("Invitation cannot be sent for this onboarding status");
  }

  const { rawToken, expiresAt } = await createOnboardingInvitationToken(
    caseId,
    organizationId,
    profile.userId,
  );
  const tokenHash = hashOnboardingToken(rawToken);
  await revokeActiveInvitationTokensExcept(caseId, tokenHash);

  const inviteUrl = onboardingInviteUrl(rawToken);
  const expiryLabel = new Date(expiresAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const invitationEmail = renderOnboardingInvitationEmail({
    candidateName: detail.fullName,
    personalEmail: detail.personalEmail,
    inviteUrl,
    expiryLabel,
    joiningDate: detail.joiningDate,
    includeJoiningDate: !detail.invitationSentAt && detail.status === "draft",
    designationName: detail.designationName,
    departmentName: detail.departmentName,
    workLocationName: detail.workLocationName,
    employmentTypeName: detail.employmentTypeName,
    reportingManagerName: detail.reportingManagerName,
  });

  const recipient = detail.personalEmail.trim().toLowerCase();
  const emailResult = await sendEmail({
    to: recipient,
    subject: invitationEmail.subject,
    html: invitationEmail.html,
    text: invitationEmail.text,
  });

  if (!emailResult.delivered) {
    if (emailResult.skipped) {
      throw new Error(
        emailResult.error ??
          "Invitation email could not be sent — SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM in your environment (and in Vercel for production), then redeploy.",
      );
    }
    throw new Error(
      emailResult.error ?? "Failed to deliver invitation email. Please check SMTP settings and try again.",
    );
  }

  await ensurePortalAccountForInvitation(caseId, recipient);

  const now = new Date().toISOString();

  const { error } = await supabase
    .schema("hrms")
    .from("onboarding_cases")
    .update({
      status: "invitation_sent",
      invitation_sent_at: now,
      invitation_expires_at: expiresAt,
      onboarding_account_active: true,
      cancelled_at: null,
      archived_at: null,
      updated_by: profile.userId,
      updated_at: now,
    })
    .eq("id", caseId);

  if (error) throw new Error(error.message);

  await addTimelineEvent(supabase, caseId, {
    eventType: "invitation_sent",
    title:
      detail.status === "cancelled"
        ? "Onboarding reopened — invitation sent"
        : "Onboarding invitation sent",
    description: `Invitation emailed to ${detail.personalEmail}`,
    actorUserId: profile.userId,
  });
}

export async function saveOnboardingSection(
  supabase: AuthSupabaseClient,
  caseId: string,
  sectionKey: string,
  data: Record<string, unknown>,
  markComplete?: boolean,
) {
  const now = new Date().toISOString();
  const { error } = await supabase.schema("hrms").from("onboarding_sections").upsert(
    {
      case_id: caseId,
      section_key: sectionKey,
      data,
      completed_at: markComplete ? now : null,
      updated_at: now,
    },
    { onConflict: "case_id,section_key" },
  );
  if (error) throw new Error(error.message);

  await supabase
    .schema("hrms")
    .from("onboarding_cases")
    .update({ status: "in_progress", updated_at: now })
    .eq("id", caseId)
    .in("status", ["invitation_sent", "invitation_viewed", "corrections_requested", "draft", "documents_uploaded"]);

  await refreshCompletionPercent(caseId);
}

export async function uploadOnboardingDocument(
  supabase: AuthSupabaseClient,
  caseId: string,
  organizationId: string,
  input: {
    documentCategory: string;
    documentTypeCode: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    bytes: Uint8Array;
  },
): Promise<string> {
  const admin = createAdminClient();
  const path = `${organizationId}/${caseId}/${crypto.randomUUID()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { error: uploadError } = await admin.storage
    .from(ONBOARDING_STORAGE_BUCKET)
    .upload(path, input.bytes, { contentType: input.mimeType, upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .schema("hrms")
    .from("onboarding_documents")
    .insert({
      case_id: caseId,
      document_category: input.documentCategory,
      document_type_code: input.documentTypeCode,
      storage_path: path,
      file_name: input.fileName,
      file_size: input.fileSize,
      mime_type: input.mimeType,
      review_status: "pending",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .schema("hrms")
    .from("onboarding_cases")
    .update({ status: "documents_uploaded", updated_at: new Date().toISOString() })
    .eq("id", caseId);

  await refreshCompletionPercent(caseId);
  return data.id;
}

export async function savePolicyAcknowledgements(caseId: string, policyCodes: string[]) {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .schema("hrms")
    .from("onboarding_policy_acknowledgements")
    .select("policy_code")
    .eq("case_id", caseId);

  const keep = new Set(policyCodes);
  for (const row of existing ?? []) {
    if (!keep.has(row.policy_code)) {
      await admin
        .schema("hrms")
        .from("onboarding_policy_acknowledgements")
        .delete()
        .eq("case_id", caseId)
        .eq("policy_code", row.policy_code);
    }
  }

  for (const code of policyCodes) {
    await admin.schema("hrms").from("onboarding_policy_acknowledgements").upsert(
      { case_id: caseId, policy_code: code, acknowledged_at: now },
      { onConflict: "case_id,policy_code" },
    );
  }
  await refreshCompletionPercent(caseId);
}

export async function saveAgreementAcceptances(caseId: string, agreementTypes: string[], signatureId?: string) {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .schema("hrms")
    .from("onboarding_agreements")
    .select("agreement_type")
    .eq("case_id", caseId);

  const keep = new Set(agreementTypes);
  for (const row of existing ?? []) {
    if (!keep.has(row.agreement_type)) {
      await admin
        .schema("hrms")
        .from("onboarding_agreements")
        .delete()
        .eq("case_id", caseId)
        .eq("agreement_type", row.agreement_type);
    }
  }

  for (const type of agreementTypes) {
    await admin.schema("hrms").from("onboarding_agreements").upsert(
      {
        case_id: caseId,
        agreement_type: type,
        signed_at: now,
        signature_id: signatureId ?? null,
        locked_at: now,
        updated_at: now,
      },
      { onConflict: "case_id,agreement_type" },
    );
  }
  await refreshCompletionPercent(caseId);
}

export async function saveOnboardingSignature(
  caseId: string,
  input: {
    signatureType: "typed" | "drawn" | "uploaded";
    signatureStyle?: string | null;
    signatureData: string;
  },
): Promise<string> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .schema("hrms")
    .from("onboarding_signatures")
    .insert({
      case_id: caseId,
      signature_type: input.signatureType,
      signature_style: input.signatureStyle ?? null,
      signature_data: input.signatureData,
      finalized_at: now,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  await refreshCompletionPercent(caseId);
  return data.id;
}

export async function submitOnboardingForReview(caseId: string, actorUserId?: string | null) {
  const admin = createAdminClient();
  const completionPercent = await refreshCompletionPercent(caseId);
  const now = new Date().toISOString();

  const { error } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .update({
      status: "pending_hr_review",
      submitted_at: now,
      completion_percent: completionPercent,
      updated_at: now,
    })
    .eq("id", caseId);

  if (error) throw new Error(error.message);

  await addTimelineEvent(admin, caseId, {
    eventType: "submitted",
    title: "Onboarding submitted for HR review",
    actorUserId,
  });
}

export async function reviewOnboardingDocument(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  documentId: string,
  reviewStatus: "approved" | "rejected" | "correction_requested",
  hrComment?: string | null,
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .schema("hrms")
    .from("onboarding_documents")
    .update({
      review_status: reviewStatus,
      hr_comment: hrComment ?? null,
      reviewed_by: profile.userId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", documentId)
    .select("case_id")
    .single();

  if (error) throw new Error(error.message);

  await addTimelineEvent(supabase, data.case_id, {
    eventType: "document_reviewed",
    title: `Document ${reviewStatus.replace("_", " ")}`,
    description: hrComment ?? undefined,
    actorUserId: profile.userId,
  });
}

export async function processOnboardingReview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  caseId: string,
  action: "approve" | "reject" | "request_corrections",
  hrComments?: string | null,
  correctionNotes?: string | null,
  intendedRoleId?: string | null,
  companyEmail?: string | null,
) {
  const organizationId = profile.employee.organizationId;
  const now = new Date().toISOString();

  if (action === "reject") {
    await supabase
      .schema("hrms")
      .from("onboarding_cases")
      .update({
        status: "rejected",
        rejected_at: now,
        rejected_by: profile.userId,
        hr_comments: hrComments ?? null,
        onboarding_account_active: false,
        updated_at: now,
      })
      .eq("id", caseId);
    await revokePortalSessions(caseId);
    await addTimelineEvent(supabase, caseId, {
      eventType: "rejected",
      title: "Onboarding rejected",
      description: hrComments ?? undefined,
      actorUserId: profile.userId,
    });
    return;
  }

  if (action === "request_corrections") {
    const detail = await getOnboardingCaseDetail(supabase, organizationId, caseId);
    await supabase
      .schema("hrms")
      .from("onboarding_cases")
      .update({
        status: "corrections_requested",
        correction_notes: correctionNotes ?? hrComments ?? null,
        onboarding_account_active: true,
        updated_at: now,
      })
      .eq("id", caseId);
    await addTimelineEvent(supabase, caseId, {
      eventType: "corrections_requested",
      title: "Corrections requested",
      description: correctionNotes ?? hrComments ?? undefined,
      actorUserId: profile.userId,
    });

    const portalLoginUrl = `${siteConfig.url}${ONBOARDING_ROUTES.login}`;
    const correctionsEmail = renderOnboardingCorrectionsEmail({
      candidateName: detail.fullName,
      personalEmail: detail.personalEmail,
      portalLoginUrl,
      correctionNotes: correctionNotes ?? hrComments ?? null,
    });
    await sendEmail({
      to: detail.personalEmail,
      subject: correctionsEmail.subject,
      html: correctionsEmail.html,
      text: correctionsEmail.text,
    });
    return;
  }

  if (intendedRoleId) {
    await supabase
      .schema("hrms")
      .from("onboarding_cases")
      .update({ intended_role_id: intendedRoleId, updated_at: now })
      .eq("id", caseId);
  }

  const normalizedCompanyEmail = companyEmail?.trim().toLowerCase();
  if (!normalizedCompanyEmail) {
    throw new Error("Company email is required to approve onboarding");
  }

  await activateOnboardingCase(
    supabase,
    profile,
    caseId,
    normalizedCompanyEmail,
    hrComments,
    intendedRoleId ?? undefined,
  );
}

async function assertCompanyEmailAvailable(
  organizationId: string,
  companyEmail: string,
): Promise<void> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .schema("hrms")
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .ilike("email", companyEmail)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) {
    throw new Error("This company email is already assigned to another employee");
  }
}

export async function activateOnboardingCase(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  caseId: string,
  companyEmail: string,
  hrComments?: string | null,
  intendedRoleId?: string,
) {
  const organizationId = profile.employee.organizationId;
  const detail = await getOnboardingCaseDetail(supabase, organizationId, caseId);
  const admin = createAdminClient();
  const normalizedCompanyEmail = companyEmail.trim().toLowerCase();

  await assertCompanyEmailAvailable(organizationId, normalizedCompanyEmail);

  const authUserId = await getOnboardingPortalAuthUserId(caseId);
  if (!authUserId) {
    throw new Error(
      "The candidate has not finished portal password setup. Ask them to complete onboarding login first.",
    );
  }

  const { firstName, lastName } = parseFullName(detail.fullName);
  const employeeCode = await allocateNextEmployeeCode(organizationId);

  const { data: caseRow, error: caseError } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .select(
      "department_id, designation_id, branch_id, reporting_manager_id, employment_type_id, work_location_id, intended_role_id",
    )
    .eq("id", caseId)
    .single();

  if (caseError || !caseRow) throw new Error(caseError?.message ?? "Case not found");

  const personalSection = detail.sections.find((s) => s.sectionKey === "personal")?.data ?? {};

  const { data: employee, error: empError } = await admin
    .schema("hrms")
    .from("employees")
    .insert({
      organization_id: organizationId,
      branch_id: caseRow.branch_id,
      department_id: caseRow.department_id,
      designation_id: caseRow.designation_id,
      employment_type_id: caseRow.employment_type_id,
      reporting_manager_id: caseRow.reporting_manager_id,
      employee_code: employeeCode,
      first_name: firstName,
      last_name: lastName,
      email: normalizedCompanyEmail,
      phone: detail.mobileNumber ?? (personalSection.personalMobile as string | undefined) ?? null,
      employment_status: "draft",
      account_status: "draft",
      date_of_joining: detail.joiningDate,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (empError) throw new Error(empError.message);

  const resolvedRoleId = intendedRoleId ?? caseRow.intended_role_id;
  if (!resolvedRoleId) {
    throw new Error("Portal role is required to activate the employee account");
  }

  await finalizeEmployeeActivation(
    supabase,
    profile,
    caseId,
    employee.id,
    normalizedCompanyEmail,
    employeeCode,
    hrComments,
    detail,
    resolvedRoleId,
    authUserId,
  );
}

async function finalizeEmployeeActivation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  caseId: string,
  employeeId: string,
  companyEmail: string,
  employeeCode: string,
  hrComments: string | null | undefined,
  detail: Awaited<ReturnType<typeof getOnboardingCaseDetail>>,
  intendedRoleId: string,
  authUserId: string,
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await syncOnboardingDataToEmployee(supabase, profile, caseId, employeeId, detail);

  await admin
    .schema("hrms")
    .from("onboarding_cases")
    .update({
      status: "employee_created",
      approved_at: now,
      approved_by: profile.userId,
      hr_comments: hrComments ?? null,
      employee_id: employeeId,
      company_email: companyEmail,
      employee_code: employeeCode,
      completion_percent: 100,
      updated_at: now,
    })
    .eq("id", caseId);

  await revokePortalSessions(caseId);
  await admin
    .schema("hrms")
    .from("onboarding_cases")
    .update({ onboarding_account_active: false })
    .eq("id", caseId);

  await activateEmployeeAccountFromOnboarding(
    supabase,
    profile,
    employeeId,
    authUserId,
    companyEmail,
    intendedRoleId,
  );

  const loginUrl = `${siteConfig.url}/login`;

  const accountReadyEmail = renderOnboardingAccountReadyEmail({
    candidateName: detail.fullName,
    companyEmail,
    employeeCode,
    loginUrl,
  });

  await sendEmail({
    to: detail.personalEmail,
    subject: accountReadyEmail.subject,
    html: accountReadyEmail.html,
    text: accountReadyEmail.text,
  });

  await addTimelineEvent(supabase, caseId, {
    eventType: "employee_created",
    title: "Employee record created",
    description: `${employeeCode} · ${companyEmail}`,
    actorUserId: profile.userId,
  });

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "onboarding",
    action: "activate",
    description: `Onboarding approved — employee ${employeeCode} created`,
    recordId: caseId,
  });
}

export async function cancelOnboardingCase(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  caseId: string,
) {
  const organizationId = profile.employee.organizationId;
  const detail = await getOnboardingCaseDetail(supabase, organizationId, caseId);

  if (
    ["cancelled", "archived", "employee_created", "completed", "rejected"].includes(detail.status)
  ) {
    throw new Error("This onboarding cannot be cancelled");
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .schema("hrms")
    .from("onboarding_cases")
    .update({
      status: "cancelled",
      cancelled_at: now,
      onboarding_account_active: false,
      updated_by: profile.userId,
      updated_at: now,
    })
    .eq("id", caseId);

  if (error) throw new Error(error.message);

  await revokePortalSessions(caseId);
  await revokeActiveInvitationTokens(caseId);
  await addTimelineEvent(supabase, caseId, {
    eventType: "cancelled",
    title: "Onboarding cancelled",
    actorUserId: profile.userId,
  });
}

export async function archiveOnboardingCase(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  caseId: string,
) {
  const now = new Date().toISOString();
  await supabase
    .schema("hrms")
    .from("onboarding_cases")
    .update({
      status: "archived",
      archived_at: now,
      onboarding_account_active: false,
      updated_by: profile.userId,
      updated_at: now,
    })
    .eq("id", caseId);
  await revokePortalSessions(caseId);
  await addTimelineEvent(supabase, caseId, {
    eventType: "archived",
    title: "Onboarding archived",
    actorUserId: profile.userId,
  });
}

export async function deleteOnboardingCase(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  caseId: string,
) {
  const organizationId = profile.employee.organizationId;
  const detail = await getOnboardingCaseDetail(supabase, organizationId, caseId);

  if (["employee_created", "completed"].includes(detail.status)) {
    throw new Error("Cannot delete onboarding after an employee record has been created");
  }

  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .update({
      deleted_at: now,
      onboarding_account_active: false,
      updated_by: profile.userId,
      updated_at: now,
    })
    .eq("id", caseId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  await revokePortalSessions(caseId);
  await revokeActiveInvitationTokens(caseId);
  await addTimelineEvent(supabase, caseId, {
    eventType: "deleted",
    title: "Onboarding deleted",
    actorUserId: profile.userId,
  });

  await writeApplicationAudit(supabase, {
    organizationId,
    module: "onboarding",
    action: "delete",
    description: `Onboarding case deleted for ${detail.fullName}`,
    recordId: caseId,
  });
}
