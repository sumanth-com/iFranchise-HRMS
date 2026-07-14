import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { ManagerRecruitmentContext } from "@/types/manager-recruitment";
import {
  notifyHrManagerFeedbackSubmitted,
  notifyHrManagerOfferRecommendation,
  notifyHrManagerRejectionRecommendation,
  notifyManagerInterviewScheduled,
} from "@/lib/manager/services/manager-recruitment-notifications";
import { assertRecruitmentDepartmentAccess } from "@/lib/manager/services/manager-recruitment-context";
import {
  assertCandidateInManagedDepartments,
} from "@/lib/manager/services/team-recruitment-detail";
import {
  averageInterviewCompetencyRating,
  mapOverallToInterviewRecommendation,
  parseOfferNotesPayload,
  serializeInterviewEvaluationPayload,
  serializeOfferNotesPayload,
} from "@/lib/manager/services/recruitment-evaluation-utils";
import {
  cancelInterview,
  moveCandidateStage,
  scheduleInterview,
  updateInterview,
} from "@/lib/recruitment/services/recruitment-mutations";
import {
  formatEmployeeName,
  fromHrms,
  nextStageAfterRecommendation,
  type PerfRow,
  unwrapRelation,
} from "@/lib/recruitment/services/recruitment-utils";
import {
  managerCandidateRecommendSchema,
  managerFeedbackSchema,
  managerInterviewEvaluationSchema,
  managerInterviewEvaluationSubmitSchema,
  managerInterviewRescheduleSchema,
  managerInterviewScheduleSchema,
  managerOfferRecommendationSchema,
  managerRejectCandidateSchema,
  teamRecruitmentInterviewIdSchema,
} from "@/lib/validations/manager-recruitment";

async function assertInterviewAccess(
  supabase: AuthSupabaseClient,
  organizationId: string,
  interviewId: string,
  departmentIds: string[],
) {
  const { data, error } = await fromHrms(supabase, "recruitment_interviews")
    .select(
      `id, candidate_id,
      job:job_opening_id!inner(department_id)`,
    )
    .eq("id", interviewId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Interview not found");

  const job = unwrapRelation((data as PerfRow).job);
  assertRecruitmentDepartmentAccess(departmentIds, job?.department_id ?? null);
  return data as PerfRow;
}

async function assertOfferAccess(
  supabase: AuthSupabaseClient,
  organizationId: string,
  offerId: string,
  departmentIds: string[],
) {
  const { data, error } = await fromHrms(supabase, "recruitment_offers")
    .select("id, department_id, candidate_id, notes, offer_status")
    .eq("id", offerId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Offer not found");

  assertRecruitmentDepartmentAccess(departmentIds, data.department_id);
  return data as PerfRow;
}

async function addTimeline(
  supabase: AuthSupabaseClient,
  organizationId: string,
  candidateId: string,
  userId: string,
  event: { eventType: string; title: string; description?: string | null },
) {
  await fromHrms(supabase, "recruitment_candidate_timeline").insert({
    organization_id: organizationId,
    candidate_id: candidateId,
    event_type: event.eventType,
    title: event.title,
    description: event.description ?? null,
    created_by: userId,
  });
}

export async function scheduleTeamRecruitmentInterview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
  input: unknown,
) {
  const parsed = managerInterviewScheduleSchema.parse(input);
  const { organizationId, departmentIds } = context;

  await assertCandidateInManagedDepartments(
    supabase,
    organizationId,
    parsed.candidateId,
    departmentIds,
  );

  const interviewId = await scheduleInterview(supabase, profile, parsed);

  const { data: candidate } = await fromHrms(supabase, "recruitment_candidates")
    .select("first_name, last_name")
    .eq("id", parsed.candidateId)
    .maybeSingle();

  const candidateName = candidate
    ? formatEmployeeName(candidate.first_name, candidate.last_name)
    : "candidate";

  if (parsed.interviewerEmployeeId !== context.managerId) {
    await notifyManagerInterviewScheduled(
      supabase,
      profile,
      parsed.interviewerEmployeeId,
      candidateName,
      parsed.roundName,
      `${parsed.interviewDate} ${parsed.interviewTime}`,
      interviewId,
    );
  }

  return { success: true as const, message: "Interview scheduled.", interviewId };
}

export async function rescheduleTeamRecruitmentInterview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
  input: unknown,
) {
  const parsed = managerInterviewRescheduleSchema.parse(input);
  const { organizationId, departmentIds } = context;

  const interview = await assertInterviewAccess(
    supabase,
    organizationId,
    parsed.interviewId,
    departmentIds,
  );

  await updateInterview(supabase, profile, parsed.interviewId, {
    roundName: parsed.roundName,
    interviewDate: parsed.interviewDate,
    interviewTime: parsed.interviewTime,
    meetingLink: parsed.meetingLink,
    interviewType: parsed.interviewType,
    durationMinutes: parsed.durationMinutes,
    interviewerEmployeeId: parsed.interviewerEmployeeId,
  });

  if (parsed.interviewerEmployeeId && parsed.interviewerEmployeeId !== context.managerId) {
    const { data: candidate } = await fromHrms(supabase, "recruitment_candidates")
      .select("first_name, last_name")
      .eq("id", interview.candidate_id)
      .maybeSingle();
    const candidateName = candidate
      ? formatEmployeeName(candidate.first_name, candidate.last_name)
      : "candidate";

    await notifyManagerInterviewScheduled(
      supabase,
      profile,
      parsed.interviewerEmployeeId,
      candidateName,
      parsed.roundName,
      `${parsed.interviewDate} ${parsed.interviewTime}`,
      parsed.interviewId,
    );
  }

  return { success: true as const, message: "Interview rescheduled." };
}

export async function cancelTeamRecruitmentInterview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
  interviewId: string,
) {
  const parsed = teamRecruitmentInterviewIdSchema.parse({ interviewId });
  await assertInterviewAccess(
    supabase,
    context.organizationId,
    parsed.interviewId,
    context.departmentIds,
  );

  await cancelInterview(supabase, profile, parsed.interviewId);
  return { success: true as const, message: "Interview cancelled." };
}

export async function saveTeamInterviewEvaluation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
  input: unknown,
) {
  const parsed = managerInterviewEvaluationSchema.parse(input);
  const { organizationId, departmentIds } = context;

  const interview = await assertInterviewAccess(
    supabase,
    organizationId,
    parsed.interviewId,
    departmentIds,
  );

  const rating = averageInterviewCompetencyRating(parsed.competencies) ?? 3;
  const recommendation = mapOverallToInterviewRecommendation(parsed.overallRecommendation);

  const comments = serializeInterviewEvaluationPayload({
    competencies: parsed.competencies,
    overallRecommendation: parsed.overallRecommendation,
    strengths: parsed.strengths,
    improvements: parsed.improvements,
    confidentialNotes: parsed.confidentialNotes,
    draft: true,
  });

  const { error } = await fromHrms(supabase, "recruitment_interviews")
    .update({
      rating,
      comments,
      recommendation,
      updated_by: profile.userId,
    })
    .eq("id", parsed.interviewId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  return {
    success: true as const,
    message: "Evaluation draft saved.",
    candidateId: interview.candidate_id as string,
  };
}

export async function submitTeamInterviewEvaluation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
  input: unknown,
) {
  const parsed = managerInterviewEvaluationSubmitSchema.parse(input);
  const { organizationId, departmentIds } = context;

  const interview = await assertInterviewAccess(
    supabase,
    organizationId,
    parsed.interviewId,
    departmentIds,
  );

  const rating = averageInterviewCompetencyRating(parsed.competencies);
  if (!rating) {
    throw new Error("Rate at least one competency before submitting.");
  }

  const recommendation = mapOverallToInterviewRecommendation(parsed.overallRecommendation);
  const comments = serializeInterviewEvaluationPayload({
    competencies: parsed.competencies,
    overallRecommendation: parsed.overallRecommendation,
    strengths: parsed.strengths,
    improvements: parsed.improvements,
    confidentialNotes: parsed.confidentialNotes,
    draft: false,
  });

  const { error } = await fromHrms(supabase, "recruitment_interviews")
    .update({
      interview_status: "completed",
      rating,
      comments,
      recommendation,
      completed_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", parsed.interviewId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const { data: candidateRow } = await fromHrms(supabase, "recruitment_candidates")
    .select("id, stage, first_name, last_name")
    .eq("id", interview.candidate_id)
    .maybeSingle();

  if (candidateRow) {
    const nextStage = nextStageAfterRecommendation(
      recommendation,
      candidateRow.stage,
    );
    await moveCandidateStage(supabase, profile, {
      candidateId: candidateRow.id,
      stage: nextStage,
      reason: `Interview recommendation: ${recommendation}`,
    });
  }

  const managerName = formatEmployeeName(
    profile.employee.firstName,
    profile.employee.lastName,
  );
  const candidateName = candidateRow
    ? formatEmployeeName(candidateRow.first_name, candidateRow.last_name)
    : "candidate";

  await notifyHrManagerFeedbackSubmitted(
    supabase,
    profile,
    managerName,
    candidateName,
    interview.candidate_id as string,
  );

  return {
    success: true as const,
    message: "Interview evaluation submitted.",
    candidateId: interview.candidate_id as string,
  };
}

export async function submitTeamManagerFeedback(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
  input: unknown,
) {
  const parsed = managerFeedbackSchema.parse(input);
  const { organizationId, departmentIds } = context;

  await assertCandidateInManagedDepartments(
    supabase,
    organizationId,
    parsed.candidateId,
    departmentIds,
  );

  const prefix = parsed.draft ? "[Draft Feedback]" : "[Manager Feedback]";
  const label = parsed.feedbackType.replace("_", " ");
  const entry = `${prefix} (${label}) — ${new Date().toISOString()}\n${parsed.content.trim()}`;

  const { data: candidate, error: fetchError } = await fromHrms(supabase, "recruitment_candidates")
    .select("id, notes, first_name, last_name")
    .eq("id", parsed.candidateId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!candidate) throw new Error("Candidate not found");

  const existingNotes = candidate.notes ? `${candidate.notes}\n\n` : "";
  const { error } = await fromHrms(supabase, "recruitment_candidates")
    .update({
      notes: `${existingNotes}${entry}`,
      updated_by: profile.userId,
    })
    .eq("id", parsed.candidateId);

  if (error) throw new Error(error.message);

  if (!parsed.draft) {
    await addTimeline(supabase, organizationId, parsed.candidateId, profile.userId, {
      eventType: "feedback",
      title: `Manager feedback (${label})`,
      description: parsed.content.trim(),
    });

    const managerName = formatEmployeeName(
      profile.employee.firstName,
      profile.employee.lastName,
    );
    await notifyHrManagerFeedbackSubmitted(
      supabase,
      profile,
      managerName,
      formatEmployeeName(candidate.first_name, candidate.last_name),
      parsed.candidateId,
    );
  }

  return {
    success: true as const,
    message: parsed.draft ? "Feedback draft saved." : "Feedback submitted.",
  };
}

export async function recommendTeamCandidate(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
  input: unknown,
) {
  const parsed = managerCandidateRecommendSchema.parse(input);
  const { organizationId, departmentIds } = context;

  await assertCandidateInManagedDepartments(
    supabase,
    organizationId,
    parsed.candidateId,
    departmentIds,
  );

  const { data: candidate } = await fromHrms(supabase, "recruitment_candidates")
    .select("stage, first_name, last_name")
    .eq("id", parsed.candidateId)
    .maybeSingle();

  const resolvedStage =
    parsed.recommendation === "reject"
      ? "rejected"
      : parsed.recommendation === "offer"
        ? "offer"
        : candidate
          ? nextStageAfterRecommendation("next_round", candidate.stage)
          : "screening";

  await moveCandidateStage(supabase, profile, {
    candidateId: parsed.candidateId,
    stage: resolvedStage,
    reason: parsed.notes ?? `Manager recommendation: ${parsed.recommendation}`,
  });

  const managerName = formatEmployeeName(
    profile.employee.firstName,
    profile.employee.lastName,
  );
  const candidateName = candidate
    ? formatEmployeeName(candidate.first_name, candidate.last_name)
    : "candidate";

  if (parsed.recommendation === "reject") {
    await notifyHrManagerRejectionRecommendation(
      supabase,
      profile,
      managerName,
      candidateName,
      parsed.candidateId,
    );
  } else if (parsed.recommendation === "offer") {
    await notifyHrManagerOfferRecommendation(
      supabase,
      profile,
      managerName,
      candidateName,
      "approve",
      parsed.candidateId,
    );
  }

  return { success: true as const, message: "Recommendation recorded." };
}

export async function rejectTeamCandidate(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
  input: unknown,
) {
  const parsed = managerRejectCandidateSchema.parse(input);

  await assertCandidateInManagedDepartments(
    supabase,
    context.organizationId,
    parsed.candidateId,
    context.departmentIds,
  );

  await moveCandidateStage(supabase, profile, {
    candidateId: parsed.candidateId,
    stage: "rejected",
    reason: parsed.reason ?? "Rejected by hiring manager",
  });

  const { data: candidate } = await fromHrms(supabase, "recruitment_candidates")
    .select("first_name, last_name")
    .eq("id", parsed.candidateId)
    .maybeSingle();

  const managerName = formatEmployeeName(
    profile.employee.firstName,
    profile.employee.lastName,
  );
  await notifyHrManagerRejectionRecommendation(
    supabase,
    profile,
    managerName,
    candidate
      ? formatEmployeeName(candidate.first_name, candidate.last_name)
      : "candidate",
    parsed.candidateId,
  );

  return { success: true as const, message: "Candidate rejected." };
}

export async function submitTeamOfferRecommendation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
  input: unknown,
) {
  const parsed = managerOfferRecommendationSchema.parse(input);
  const { organizationId, departmentIds, managerId } = context;

  const offer = await assertOfferAccess(
    supabase,
    organizationId,
    parsed.offerId,
    departmentIds,
  );

  if (!["draft", "sent"].includes(String(offer.offer_status))) {
    throw new Error("This offer is no longer awaiting manager recommendation.");
  }

  const existing = parseOfferNotesPayload(offer.notes as string | null);
  const notes = serializeOfferNotesPayload(
    {
      managerApproval: {
        recommendation: parsed.recommendation,
        notes: parsed.notes ?? null,
        managerId,
        at: new Date().toISOString(),
      },
      hrNotes: existing.hrNotes,
    },
    existing.hrNotes,
  );

  const { error } = await fromHrms(supabase, "recruitment_offers")
    .update({
      notes,
      updated_by: profile.userId,
    })
    .eq("id", parsed.offerId);

  if (error) throw new Error(error.message);

  const { data: candidate } = await fromHrms(supabase, "recruitment_candidates")
    .select("first_name, last_name")
    .eq("id", offer.candidate_id)
    .maybeSingle();

  const managerName = formatEmployeeName(
    profile.employee.firstName,
    profile.employee.lastName,
  );
  const candidateName = candidate
    ? formatEmployeeName(candidate.first_name, candidate.last_name)
    : "candidate";

  await addTimeline(supabase, organizationId, offer.candidate_id as string, profile.userId, {
    eventType: "offer_status",
    title: `Manager offer recommendation: ${parsed.recommendation}`,
    description: parsed.notes ?? null,
  });

  if (parsed.recommendation === "reject") {
    await notifyHrManagerRejectionRecommendation(
      supabase,
      profile,
      managerName,
      candidateName,
      offer.candidate_id as string,
    );
  } else {
    await notifyHrManagerOfferRecommendation(
      supabase,
      profile,
      managerName,
      candidateName,
      parsed.recommendation,
      parsed.offerId,
    );
  }

  return { success: true as const, message: "Offer recommendation submitted." };
}
