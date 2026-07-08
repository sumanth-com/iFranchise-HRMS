import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { z } from "zod";
import type {
  candidateFormSchema,
  interviewCompleteSchema,
  interviewFormSchema,
  jobFormSchema,
  moveStageSchema,
  offerFormSchema,
  offerStatusSchema,
} from "@/lib/validations/recruitment";
import { DESIGNATION_OTHER_VALUE } from "@/lib/employees/constants";
import { resolveOrCreateDesignation } from "@/lib/employees/services/employee-mutations";
import { suggestNextEmployeeCode } from "@/lib/employees/services/employee-queries";
import { CANDIDATE_STAGE_LABELS } from "@/lib/recruitment/constants";
import {
  notifyInterviewCancelled,
  notifyInterviewScheduled,
  notifyJoiningReminder,
  notifyOfferStatus,
} from "@/lib/recruitment/services/recruitment-notifications";
import {
  getRecruitmentSettings,
  nextRecruitmentCode,
} from "@/lib/recruitment/services/recruitment-settings";
import {
  emptyToNull,
  fromHrms,
  nextStageAfterRecommendation,
  parseSkills,
  type PerfRow,
  unwrapRelation,
} from "@/lib/recruitment/services/recruitment-utils";

async function resolveJobDesignationId(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof jobFormSchema>,
): Promise<string | null> {
  if (input.designationId === DESIGNATION_OTHER_VALUE) {
    return resolveOrCreateDesignation(
      supabase,
      profile.employee.organizationId,
      profile.userId,
      input.customDesignationTitle ?? "",
    );
  }
  return emptyToNull(input.designationId as string | null);
}

async function addTimeline(
  supabase: AuthSupabaseClient,
  organizationId: string,
  candidateId: string,
  userId: string,
  event: {
    eventType: string;
    title: string;
    description?: string | null;
    fromStage?: string | null;
    toStage?: string | null;
  },
) {
  await fromHrms(supabase, "recruitment_candidate_timeline").insert({
    organization_id: organizationId,
    candidate_id: candidateId,
    event_type: event.eventType,
    title: event.title,
    description: event.description ?? null,
    from_stage: event.fromStage ?? null,
    to_stage: event.toStage ?? null,
    created_by: userId,
  });
}

export async function createJobOpening(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof jobFormSchema>,
): Promise<string> {
  const organizationId = profile.employee.organizationId;
  const settings = await getRecruitmentSettings(supabase, organizationId);
  const designationId = await resolveJobDesignationId(supabase, profile, input);
  const jobCode = await nextRecruitmentCode(
    supabase,
    organizationId,
    "recruitment_job_openings",
    "job_code",
    settings.numberFormats.jobPrefix,
  );
  const hiringManagerId =
    emptyToNull(input.hiringManagerId as string | null) ??
    settings.defaultHiringManagerId ??
    null;

  const { data, error } = await fromHrms(supabase, "recruitment_job_openings")
    .insert({
      organization_id: organizationId,
      job_code: jobCode,
      title: input.title.trim(),
      department_id: emptyToNull(input.departmentId as string | null),
      designation_id: designationId,
      employment_type_id: emptyToNull(input.employmentTypeId as string | null),
      experience_min: input.experienceMin ?? null,
      experience_max: input.experienceMax ?? null,
      salary_min: input.salaryMin ?? null,
      salary_max: input.salaryMax ?? null,
      open_positions: input.openPositions,
      location: emptyToNull(input.location),
      work_mode: input.workMode,
      hiring_manager_id: hiringManagerId,
      required_skills: parseSkills(input.requiredSkills),
      job_description: emptyToNull(input.jobDescription),
      job_status: input.jobStatus,
      published_at: input.jobStatus === "open" ? new Date().toISOString() : null,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateJobOpening(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  id: string,
  input: z.infer<typeof jobFormSchema>,
): Promise<void> {
  const designationId = await resolveJobDesignationId(supabase, profile, input);

  const { error } = await fromHrms(supabase, "recruitment_job_openings")
    .update({
      title: input.title.trim(),
      department_id: emptyToNull(input.departmentId as string | null),
      designation_id: designationId,
      employment_type_id: emptyToNull(input.employmentTypeId as string | null),
      experience_min: input.experienceMin ?? null,
      experience_max: input.experienceMax ?? null,
      salary_min: input.salaryMin ?? null,
      salary_max: input.salaryMax ?? null,
      open_positions: input.openPositions,
      location: emptyToNull(input.location),
      work_mode: input.workMode,
      hiring_manager_id: emptyToNull(input.hiringManagerId as string | null),
      required_skills: parseSkills(input.requiredSkills),
      job_description: emptyToNull(input.jobDescription),
      job_status: input.jobStatus,
      closed_at: input.jobStatus === "closed" ? new Date().toISOString() : null,
      updated_by: profile.userId,
    })
    .eq("id", id)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function duplicateJobOpening(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  id: string,
): Promise<string> {
  const { data, error } = await fromHrms(supabase, "recruitment_job_openings")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Job opening not found");

  const row = data as PerfRow;
  const settings = await getRecruitmentSettings(supabase, profile.employee.organizationId);
  const jobCode = await nextRecruitmentCode(
    supabase,
    profile.employee.organizationId,
    "recruitment_job_openings",
    "job_code",
    settings.numberFormats.jobPrefix,
  );
  const { data: created, error: createError } = await fromHrms(supabase, "recruitment_job_openings")
    .insert({
      organization_id: profile.employee.organizationId,
      job_code: jobCode,
      title: `${row.title} (Copy)`,
      department_id: row.department_id,
      designation_id: row.designation_id,
      employment_type_id: row.employment_type_id,
      experience_min: row.experience_min,
      experience_max: row.experience_max,
      salary_min: row.salary_min,
      salary_max: row.salary_max,
      open_positions: row.open_positions,
      location: row.location,
      work_mode: row.work_mode,
      hiring_manager_id: row.hiring_manager_id,
      required_skills: row.required_skills,
      job_description: row.job_description,
      job_status: "draft",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (createError) throw new Error(createError.message);
  return created.id;
}

export async function closeJobOpening(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  id: string,
): Promise<void> {
  const { error } = await fromHrms(supabase, "recruitment_job_openings")
    .update({
      job_status: "closed",
      closed_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", id)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function createCandidate(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof candidateFormSchema>,
): Promise<string> {
  const organizationId = profile.employee.organizationId;

  const { data: job, error: jobError } = await fromHrms(supabase, "recruitment_job_openings")
    .select("id, job_status")
    .eq("id", input.jobOpeningId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (jobError) throw new Error(jobError.message);
  if (!job) throw new Error("Job opening not found");
  if (job.job_status === "closed") throw new Error("Cannot apply to a closed job");

  const settings = await getRecruitmentSettings(supabase, organizationId);
  const candidateCode = await nextRecruitmentCode(
    supabase,
    organizationId,
    "recruitment_candidates",
    "candidate_code",
    settings.numberFormats.candidatePrefix,
  );

  const noticePeriodLabel = emptyToNull(input.noticePeriod);
  let noticePeriodDays = input.noticePeriodDays ?? null;
  if (noticePeriodLabel && noticePeriodDays == null) {
    if (noticePeriodLabel === "Immediate") noticePeriodDays = 0;
    else {
      const match = noticePeriodLabel.match(/(\d+)/);
      if (match) noticePeriodDays = Number.parseInt(match[1], 10);
    }
  }

  const { data, error } = await fromHrms(supabase, "recruitment_candidates")
    .insert({
      organization_id: organizationId,
      candidate_code: candidateCode,
      job_opening_id: input.jobOpeningId,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: emptyToNull(input.phone),
      experience_years: input.experienceYears ?? null,
      skills: parseSkills(input.skills),
      current_company: emptyToNull(input.currentCompany),
      current_ctc: input.currentCtc ?? null,
      expected_ctc: input.expectedCtc ?? null,
      notice_period_days: noticePeriodDays,
      notice_period: noticePeriodLabel,
      source: emptyToNull(input.source),
      notes: emptyToNull(input.notes),
      stage: "applied",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await addTimeline(supabase, organizationId, data.id, profile.userId, {
    eventType: "created",
    title: "Candidate applied",
    toStage: "applied",
  });

  return data.id;
}

export async function moveCandidateStage(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof moveStageSchema>,
): Promise<void> {
  const organizationId = profile.employee.organizationId;
  const { data: candidate, error: fetchError } = await fromHrms(supabase, "recruitment_candidates")
    .select("id, stage")
    .eq("id", input.candidateId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!candidate) throw new Error("Candidate not found");

  const fromStage = candidate.stage;
  const updates: Record<string, unknown> = {
    stage: input.stage,
    updated_by: profile.userId,
  };

  if (input.stage === "rejected") {
    updates.rejected_at = new Date().toISOString();
    updates.rejection_reason = emptyToNull(input.reason);
    updates.archived_at = null;
  }
  if (input.stage === "joined") {
    updates.joined_at = new Date().toISOString();
  }
  if (fromStage === "rejected" && input.stage !== "rejected") {
    updates.archived_at = null;
    updates.rejected_at = null;
    updates.rejection_reason = null;
  }

  const { error } = await fromHrms(supabase, "recruitment_candidates")
    .update(updates)
    .eq("id", input.candidateId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  await addTimeline(supabase, organizationId, input.candidateId, profile.userId, {
    eventType: "stage_change",
    title: `Moved to ${CANDIDATE_STAGE_LABELS[input.stage]}`,
    description: emptyToNull(input.reason),
    fromStage,
    toStage: input.stage,
  });
}

export async function scheduleInterview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof interviewFormSchema>,
): Promise<string> {
  const organizationId = profile.employee.organizationId;

  const { data: candidate, error: candError } = await fromHrms(supabase, "recruitment_candidates")
    .select("id, job_opening_id, first_name, last_name")
    .eq("id", input.candidateId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (candError) throw new Error(candError.message);
  if (!candidate) throw new Error("Candidate not found");

  const settings = await getRecruitmentSettings(supabase, organizationId);
  const durationMinutes =
    input.durationMinutes ?? settings.defaultInterviewDurationMinutes;

  const { data, error } = await fromHrms(supabase, "recruitment_interviews")
    .insert({
      organization_id: organizationId,
      candidate_id: input.candidateId,
      job_opening_id: candidate.job_opening_id,
      interviewer_employee_id: input.interviewerEmployeeId,
      round_name: input.roundName.trim(),
      interview_date: input.interviewDate,
      interview_time: input.interviewTime,
      meeting_link: emptyToNull(input.meetingLink),
      interview_type: input.interviewType,
      duration_minutes: durationMinutes,
      interview_status: "scheduled",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await addTimeline(supabase, organizationId, input.candidateId, profile.userId, {
    eventType: "interview",
    title: `Interview scheduled — ${input.roundName}`,
    description: `${input.interviewDate} at ${input.interviewTime} (${durationMinutes} mins)`,
  });

  const candidateName = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ");
  await notifyInterviewScheduled(
    supabase,
    profile,
    input.interviewerEmployeeId,
    candidateName,
    input.roundName,
    `${input.interviewDate} ${input.interviewTime}`,
  );

  return data.id;
}

export async function completeInterview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof interviewCompleteSchema>,
): Promise<void> {
  const organizationId = profile.employee.organizationId;

  const { data: interview, error: fetchError } = await fromHrms(supabase, "recruitment_interviews")
    .select("id, candidate_id")
    .eq("id", input.interviewId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!interview) throw new Error("Interview not found");

  const { data: candidateRow, error: candError } = await fromHrms(
    supabase,
    "recruitment_candidates",
  )
    .select("id, stage")
    .eq("id", interview.candidate_id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (candError) throw new Error(candError.message);
  if (!candidateRow) throw new Error("Candidate not found");

  const { error } = await fromHrms(supabase, "recruitment_interviews")
    .update({
      interview_status: "completed",
      rating: input.rating,
      comments: emptyToNull(input.comments),
      recommendation: input.recommendation,
      completed_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", input.interviewId);

  if (error) throw new Error(error.message);

  const currentStage = candidateRow.stage as Parameters<
    typeof nextStageAfterRecommendation
  >[1];
  const nextStage = nextStageAfterRecommendation(input.recommendation, currentStage);

  await moveCandidateStage(supabase, profile, {
    candidateId: interview.candidate_id,
    stage: nextStage,
    reason: `Interview recommendation: ${input.recommendation}`,
  });
}

export async function cancelInterview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  interviewId: string,
): Promise<void> {
  const { data: interview, error: fetchError } = await fromHrms(supabase, "recruitment_interviews")
    .select("id, interviewer_employee_id, round_name, candidate_id")
    .eq("id", interviewId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!interview) throw new Error("Interview not found");

  const { data: candidate } = await fromHrms(supabase, "recruitment_candidates")
    .select("first_name, last_name")
    .eq("id", interview.candidate_id)
    .maybeSingle();

  const { error } = await fromHrms(supabase, "recruitment_interviews")
    .update({
      interview_status: "cancelled",
      updated_by: profile.userId,
    })
    .eq("id", interviewId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const candidateName = candidate
    ? [candidate.first_name, candidate.last_name].filter(Boolean).join(" ")
    : "candidate";

  await notifyInterviewCancelled(
    supabase,
    profile,
    interview.interviewer_employee_id,
    candidateName,
    interview.round_name,
  );
}

export async function createOffer(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof offerFormSchema>,
): Promise<string> {
  const organizationId = profile.employee.organizationId;

  const { data: candidate, error: candError } = await fromHrms(supabase, "recruitment_candidates")
    .select(
      `id, job_opening_id, first_name, last_name,
      job:job_opening_id(department_id, designation_id, employment_type_id, hiring_manager_id)`,
    )
    .eq("id", input.candidateId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (candError) throw new Error(candError.message);
  if (!candidate) throw new Error("Candidate not found");

  const job = unwrapRelation(candidate.job as PerfRow | null);
  const settings = await getRecruitmentSettings(supabase, organizationId);
  const offerCode = await nextRecruitmentCode(
    supabase,
    organizationId,
    "recruitment_offers",
    "offer_code",
    settings.numberFormats.offerPrefix,
  );

  const { data, error } = await fromHrms(supabase, "recruitment_offers")
    .insert({
      organization_id: organizationId,
      offer_code: offerCode,
      candidate_id: input.candidateId,
      job_opening_id: candidate.job_opening_id,
      department_id:
        emptyToNull(input.departmentId as string | null) ?? job?.department_id ?? null,
      designation_id:
        emptyToNull(input.designationId as string | null) ?? job?.designation_id ?? null,
      branch_id: input.branchId,
      employment_type_id:
        emptyToNull(input.employmentTypeId as string | null) ?? job?.employment_type_id ?? null,
      reporting_manager_id:
        emptyToNull(input.reportingManagerId as string | null) ?? job?.hiring_manager_id ?? null,
      salary: input.salary,
      joining_date: input.joiningDate,
      expires_at: emptyToNull(input.expiresAt),
      notes: emptyToNull(input.notes),
      offer_status: "draft",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await moveCandidateStage(supabase, profile, {
    candidateId: input.candidateId,
    stage: "offer",
    reason: "Offer created",
  });

  await addTimeline(supabase, organizationId, input.candidateId, profile.userId, {
    eventType: "offer",
    title: "Offer drafted",
    description: `Salary ${input.salary}, joining ${input.joiningDate}`,
  });

  return data.id;
}

export async function updateOfferStatus(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof offerStatusSchema>,
): Promise<{ employeeId?: string }> {
  const organizationId = profile.employee.organizationId;

  const { data: offer, error: fetchError } = await fromHrms(supabase, "recruitment_offers")
    .select("*")
    .eq("id", input.offerId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!offer) throw new Error("Offer not found");

  const settings = await getRecruitmentSettings(supabase, organizationId);

  const { data: candidate } = await fromHrms(supabase, "recruitment_candidates")
    .select("first_name, last_name")
    .eq("id", offer.candidate_id)
    .maybeSingle();
  const candidateName = candidate
    ? [candidate.first_name, candidate.last_name].filter(Boolean).join(" ")
    : "Candidate";

  const updates: Record<string, unknown> = {
    offer_status: input.offerStatus,
    updated_by: profile.userId,
  };

  if (input.offerStatus === "sent") {
    updates.sent_at = new Date().toISOString();
  }
  if (["accepted", "rejected"].includes(input.offerStatus)) {
    updates.responded_at = new Date().toISOString();
  }

  let employeeId: string | undefined;

  if (input.offerStatus === "accepted") {
    if (!settings.autoEmployeeCreation) {
      throw new Error(
        "Auto employee creation is disabled in Recruitment Settings. Enable it to hire from offers.",
      );
    }
    employeeId = await hireCandidateFromOffer(supabase, profile, offer as PerfRow);
    updates.employee_id = employeeId;
  }

  const { error } = await fromHrms(supabase, "recruitment_offers")
    .update(updates)
    .eq("id", input.offerId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  await addTimeline(supabase, organizationId, offer.candidate_id, profile.userId, {
    eventType: "offer_status",
    title: `Offer ${input.offerStatus}`,
    description: employeeId ? `Employee created: ${employeeId}` : null,
  });

  if (input.offerStatus === "sent") {
    await notifyOfferStatus(
      supabase,
      profile,
      offer.reporting_manager_id,
      "offerSent",
      "Offer sent",
      `Offer sent to ${candidateName}.`,
    );
    await notifyJoiningReminder(
      supabase,
      profile,
      offer.reporting_manager_id,
      candidateName,
      offer.joining_date,
    );
  }

  if (input.offerStatus === "accepted") {
    await notifyOfferStatus(
      supabase,
      profile,
      offer.reporting_manager_id,
      "offerAccepted",
      "Offer accepted",
      `${candidateName} accepted the offer${employeeId ? " and employee record was created" : ""}.`,
    );

    if (employeeId) {
      const { autoGenerateLetterForEmployee } = await import(
        "@/lib/documents/services/document-mutations"
      );
      const salaryText =
        offer.salary != null
          ? new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(Number(offer.salary))
          : null;

      await autoGenerateLetterForEmployee(supabase, profile, {
        employeeId,
        letterType: "offer_letter",
        salaryOverride: salaryText,
        sourceModule: "recruitment",
        sourceRecordId: input.offerId,
        publishNow: true,
      });

      await autoGenerateLetterForEmployee(supabase, profile, {
        employeeId,
        letterType: "appointment_letter",
        salaryOverride: salaryText,
        sourceModule: "recruitment",
        sourceRecordId: input.offerId,
        publishNow: true,
      });
    }
  }

  if (input.offerStatus === "rejected") {
    await notifyOfferStatus(
      supabase,
      profile,
      offer.reporting_manager_id,
      "offerRejected",
      "Offer rejected",
      `${candidateName} rejected the offer.`,
    );
    await moveCandidateStage(supabase, profile, {
      candidateId: offer.candidate_id,
      stage: "rejected",
      reason: "Offer rejected by candidate",
    });
  }

  return { employeeId };
}

async function hireCandidateFromOffer(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  offer: PerfRow,
): Promise<string> {
  if (offer.employee_id) return offer.employee_id;

  const organizationId = profile.employee.organizationId;

  const { data: candidate, error: candError } = await fromHrms(supabase, "recruitment_candidates")
    .select("*")
    .eq("id", offer.candidate_id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (candError) throw new Error(candError.message);
  if (!candidate) throw new Error("Candidate not found");

  if (candidate.employee_id) {
    await fromHrms(supabase, "recruitment_candidates")
      .update({ stage: "joined", joined_at: new Date().toISOString(), updated_by: profile.userId })
      .eq("id", candidate.id);
    return candidate.employee_id;
  }

  if (!offer.branch_id) {
    throw new Error("Branch is required on the offer to create an employee");
  }

  const employeeCode = await suggestNextEmployeeCode(supabase, organizationId);

  const { data: employee, error: empError } = await supabase
    .schema("hrms")
    .from("employees")
    .insert({
      organization_id: organizationId,
      branch_id: offer.branch_id,
      department_id: offer.department_id,
      designation_id: offer.designation_id,
      employment_type_id: offer.employment_type_id,
      reporting_manager_id: offer.reporting_manager_id,
      employee_code: employeeCode,
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone,
      employment_status: "probation",
      date_of_joining: offer.joining_date,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (empError || !employee) {
    throw new Error(empError?.message ?? "Failed to create employee from offer");
  }

  await supabase.schema("hrms").from("employee_profiles").insert({
    employee_id: employee.id,
    personal_email: candidate.email,
    personal_phone: candidate.phone,
    bio: candidate.notes,
    status: "active",
    created_by: profile.userId,
    updated_by: profile.userId,
  });

  // Login invitation marker — Auth invite requires service role (configured later).
  // Store invitation metadata on employee profile bio/notes timeline.
  await addTimeline(supabase, organizationId, candidate.id, profile.userId, {
    eventType: "hired",
    title: "Employee created from accepted offer",
    description: `Employee Code: ${employeeCode}. Login invitation pending Auth configuration for ${candidate.email}.`,
    toStage: "joined",
  });

  await fromHrms(supabase, "recruitment_candidates")
    .update({
      stage: "joined",
      joined_at: new Date().toISOString(),
      employee_id: employee.id,
      updated_by: profile.userId,
    })
    .eq("id", candidate.id);

  // Close job if filled enough
  const { data: job } = await fromHrms(supabase, "recruitment_job_openings")
    .select("id, open_positions")
    .eq("id", offer.job_opening_id)
    .maybeSingle();

  if (job) {
    const { count } = await fromHrms(supabase, "recruitment_candidates")
      .select("id", { count: "exact", head: true })
      .eq("job_opening_id", offer.job_opening_id)
      .eq("stage", "joined")
      .is("deleted_at", null);

    if ((count ?? 0) >= Number(job.open_positions ?? 1)) {
      await closeJobOpening(supabase, profile, offer.job_opening_id);
    }
  }

  return employee.id;
}
