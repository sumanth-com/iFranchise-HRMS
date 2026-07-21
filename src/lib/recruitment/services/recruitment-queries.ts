import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  AnalyticsSummary,
  CandidateDetail,
  CandidateListItem,
  CandidateListResult,
  CandidateStage,
  InterviewListItem,
  InterviewListResult,
  JobOpeningItem,
  JobOpeningListResult,
  OfferListItem,
  OfferListResult,
  RecruitmentLookups,
  RecruitmentSettings,
  RecruitmentSummary,
  TimelineItem,
} from "@/types/recruitment";
import {
  candidateListParamsSchema,
  interviewListParamsSchema,
  jobListParamsSchema,
  offerListParamsSchema,
} from "@/lib/validations/recruitment";
import {
  formatEmployeeName,
  fromHrms,
  type PerfRow,
  unwrapRelation,
} from "@/lib/recruitment/services/recruitment-utils";
import { getRecruitmentSettings, archiveRejectedCandidates } from "@/lib/recruitment/services/recruitment-settings";

export async function getRecruitmentLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<RecruitmentLookups> {
  const [departments, designations, employmentTypes, branches, employees, jobs, settings] =
    await Promise.all([
      supabase
        .schema("hrms")
        .from("departments")
        .select("id, name")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .eq("status", "active")
        .order("name"),
      supabase
        .schema("hrms")
        .from("designations")
        .select("id, title")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .eq("status", "active")
        .order("title"),
      supabase
        .schema("hrms")
        .from("employment_types")
        .select("id, name")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .eq("status", "active")
        .order("name"),
      supabase
        .schema("hrms")
        .from("branches")
        .select("id, name")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .eq("status", "active")
        .order("name"),
      supabase
        .schema("hrms")
        .from("employees")
        .select("id, first_name, last_name, employee_code")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .in("employment_status", ["active", "probation"])
        .order("first_name"),
      fromHrms(supabase, "recruitment_job_openings")
        .select("id, title, job_code, job_status")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      getRecruitmentSettings(supabase, organizationId),
    ]);

  return {
    departments: (departments.data ?? []).map((d) => ({ id: d.id, label: d.name })),
    designations: (designations.data ?? []).map((d) => ({ id: d.id, label: d.title })),
    employmentTypes: (employmentTypes.data ?? []).map((d) => ({ id: d.id, label: d.name })),
    branches: (branches.data ?? []).map((d) => ({ id: d.id, label: d.name })),
    employees: (employees.data ?? []).map((e) => ({
      id: e.id,
      label: `${formatEmployeeName(e.first_name, e.last_name)} (${e.employee_code})`,
    })),
    jobs: ((jobs.data ?? []) as PerfRow[]).map((j) => ({
      id: j.id,
      label: j.job_code ? `${j.job_code} — ${j.title}` : j.title,
      status: j.job_status,
    })),
    sources: settings.candidateSources.filter((s) => s.enabled).map((s) => s.label),
    noticePeriodOptions: settings.noticePeriodOptions,
    defaultHiringManagerId: settings.defaultHiringManagerId,
    defaultInterviewDurationMinutes: settings.defaultInterviewDurationMinutes,
  };
}

export async function getRecruitmentSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<RecruitmentSummary> {
  const organizationId = profile.employee.organizationId;
  // Apply auto-archive before summary/list metrics
  await archiveRejectedCandidates(supabase, organizationId).catch(() => 0);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const [jobs, candidates, interviews, offers, timeline] = await Promise.all([
    fromHrms(supabase, "recruitment_job_openings")
      .select("id, job_status, open_positions")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_candidates")
      .select("id, stage, joined_at, created_at, source")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_interviews")
      .select(
        `id, interview_date, interview_time, interview_status, round_name, meeting_link, interview_type,
        candidate:candidate_id(first_name, last_name),
        job:job_opening_id(title),
        interviewer:interviewer_employee_id(first_name, last_name)`,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("interview_date", today)
      .order("interview_date", { ascending: true })
      .limit(8),
    fromHrms(supabase, "recruitment_offers")
      .select("id, offer_status, created_at, responded_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_candidate_timeline")
      .select(
        `id, event_type, title, description, created_at, candidate_id,
        candidate:candidate_id(first_name, last_name)`,
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const jobRows = (jobs.data ?? []) as PerfRow[];
  const candidateRows = (candidates.data ?? []) as PerfRow[];
  const offerRows = (offers.data ?? []) as PerfRow[];

  const openJobs = jobRows.filter((j) => j.job_status === "open");
  const openPositions = openJobs.reduce((sum, j) => sum + Number(j.open_positions ?? 0), 0);
  const activeCandidates = candidateRows.filter(
    (c) => !["joined", "rejected"].includes(c.stage),
  ).length;
  const interviewsToday = ((interviews.data ?? []) as PerfRow[]).filter(
    (i) => i.interview_date === today && i.interview_status === "scheduled",
  ).length;
  const offersPending = offerRows.filter((o) => ["draft", "sent"].includes(o.offer_status)).length;
  const offersAccepted = offerRows.filter((o) => o.offer_status === "accepted").length;
  const hiresThisMonth = candidateRows.filter(
    (c) => c.stage === "joined" && c.joined_at && String(c.joined_at).slice(0, 10) >= monthStartStr,
  ).length;

  const joined = candidateRows.filter((c) => c.stage === "joined" && c.joined_at && c.created_at);
  const averageHiringTimeDays =
    joined.length > 0
      ? Math.round(
          joined.reduce((sum, c) => {
            const start = new Date(c.created_at).getTime();
            const end = new Date(c.joined_at).getTime();
            return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
          }, 0) / joined.length,
        )
      : 0;

  const stageOrder: CandidateStage[] = [
    "applied",
    "screening",
    "technical",
    "hr",
    "ceo",
    "offer",
    "joined",
  ];
  const candidatesByStage = stageOrder.map((stage) => ({
    stage,
    count: candidateRows.filter((c) => c.stage === stage).length,
  }));

  const sourceMap = new Map<string, number>();
  for (const row of candidateRows) {
    const source = row.source ? String(row.source) : "Not specified";
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
  }
  const candidateSources = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const deptResult = await fromHrms(supabase, "recruitment_candidates")
    .select(
      `id, stage, job:job_opening_id!inner(department_id, departments:department_id(name))`,
    )
    .eq("organization_id", organizationId)
    .eq("stage", "joined")
    .is("deleted_at", null);

  const deptMap = new Map<string, { departmentId: string; departmentName: string; count: number }>();
  for (const row of (deptResult.data ?? []) as PerfRow[]) {
    const job = unwrapRelation(row.job);
    const dept = unwrapRelation(job?.departments ?? null);
    const id = job?.department_id ?? "unassigned";
    const name = dept?.name ?? "Unassigned";
    const existing = deptMap.get(id) ?? { departmentId: id, departmentName: name, count: 0 };
    existing.count += 1;
    deptMap.set(id, existing);
  }

  const upcomingInterviews: InterviewListItem[] = ((interviews.data ?? []) as PerfRow[]).map(
    mapInterviewRow,
  );

  const recentActivity: TimelineItem[] = ((timeline.data ?? []) as PerfRow[]).map((row) => {
    const candidate = unwrapRelation(row.candidate);
    return {
      id: row.id,
      candidateId: row.candidate_id,
      candidateName: candidate
        ? formatEmployeeName(candidate.first_name, candidate.last_name)
        : undefined,
      eventType: row.event_type,
      title: row.title,
      description: row.description,
      createdAt: row.created_at,
    };
  });

  return {
    openPositions,
    activeCandidates,
    interviewsToday,
    offersPending,
    offersAccepted,
    hiresThisMonth,
    averageHiringTimeDays,
    candidatesByStage,
    candidateSources,
    hiringByDepartment: Array.from(deptMap.values()),
    upcomingInterviews,
    recentActivity,
  };
}

export async function getHiringAnalytics(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<AnalyticsSummary> {
  const summary = await getRecruitmentSummary(supabase, profile);
  const organizationId = profile.employee.organizationId;

  const [candidates, interviews, offers] = await Promise.all([
    fromHrms(supabase, "recruitment_candidates")
      .select("id, stage, source, joined_at, created_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_interviews")
      .select("id, interview_status, recommendation")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_offers")
      .select("id, offer_status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
  ]);

  const candidateRows = (candidates.data ?? []) as PerfRow[];
  const interviewRows = (interviews.data ?? []) as PerfRow[];
  const offerRows = (offers.data ?? []) as PerfRow[];

  const completedInterviews = interviewRows.filter((i) => i.interview_status === "completed");
  const positive = completedInterviews.filter((i) =>
    ["next_round", "offer"].includes(i.recommendation),
  ).length;
  const interviewConversionRate =
    completedInterviews.length > 0
      ? Math.round((positive / completedInterviews.length) * 100)
      : 0;

  const decidedOffers = offerRows.filter((o) =>
    ["accepted", "rejected", "expired"].includes(o.offer_status),
  );
  const accepted = offerRows.filter((o) => o.offer_status === "accepted").length;
  const offerAcceptanceRate =
    decidedOffers.length > 0 ? Math.round((accepted / decidedOffers.length) * 100) : 0;

  const sourceMap = new Map<string, number>();
  for (const c of candidateRows) {
    const source = c.source || "Other";
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
  }

  const now = new Date();
  const monthlyHiring = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    const count = candidateRows.filter((c) => {
      if (c.stage !== "joined" || !c.joined_at) return false;
      return String(c.joined_at).slice(0, 7) === key;
    }).length;
    return { month: label, count };
  });

  return {
    funnel: summary.candidatesByStage,
    hiringByDepartment: summary.hiringByDepartment.map((d) => ({
      departmentName: d.departmentName,
      count: d.count,
    })),
    averageTimeToHireDays: summary.averageHiringTimeDays,
    interviewConversionRate,
    offerAcceptanceRate,
    sources: Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count })),
    monthlyHiring,
  };
}

function mapJobRow(row: PerfRow, candidateCount = 0): JobOpeningItem {
  const dept = unwrapRelation(row.departments);
  const desig = unwrapRelation(row.designations);
  const empType = unwrapRelation(row.employment_types);
  const manager = unwrapRelation(row.hiring_manager);
  return {
    id: row.id,
    title: row.title,
    departmentId: row.department_id,
    departmentName: dept?.name ?? null,
    designationId: row.designation_id,
    designationTitle: desig?.title ?? null,
    employmentTypeId: row.employment_type_id,
    employmentTypeName: empType?.name ?? null,
    experienceMin: row.experience_min != null ? Number(row.experience_min) : null,
    experienceMax: row.experience_max != null ? Number(row.experience_max) : null,
    salaryMin: row.salary_min != null ? Number(row.salary_min) : null,
    salaryMax: row.salary_max != null ? Number(row.salary_max) : null,
    openPositions: Number(row.open_positions ?? 1),
    location: row.location,
    workMode: row.work_mode,
    hiringManagerId: row.hiring_manager_id,
    hiringManagerName: manager
      ? formatEmployeeName(manager.first_name, manager.last_name)
      : null,
    requiredSkills: row.required_skills ?? [],
    jobDescription: row.job_description,
    jobStatus: row.job_status,
    candidateCount,
    createdAt: row.created_at,
  };
}

export async function listJobOpenings(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: unknown,
): Promise<JobOpeningListResult> {
  const parsed = jobListParamsSchema.parse(params);
  const { page, pageSize, search, departmentId, jobStatus, employmentTypeId, location } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = fromHrms(supabase, "recruitment_job_openings")
    .select(
      `id, title, department_id, designation_id, employment_type_id, experience_min, experience_max,
      salary_min, salary_max, open_positions, location, work_mode, hiring_manager_id, required_skills,
      job_description, job_status, created_at,
      departments:department_id(name),
      designations:designation_id(title),
      employment_types:employment_type_id(name),
      hiring_manager:hiring_manager_id(first_name, last_name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (departmentId) query = query.eq("department_id", departmentId);
  if (jobStatus) query = query.eq("job_status", jobStatus);
  if (employmentTypeId) query = query.eq("employment_type_id", employmentTypeId);
  if (location) query = query.ilike("location", `%${location}%`);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PerfRow[];
  const jobIds = rows.map((r) => r.id);
  const counts = new Map<string, number>();
  if (jobIds.length) {
    const { data: candData } = await fromHrms(supabase, "recruitment_candidates")
      .select("job_opening_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("job_opening_id", jobIds);
    for (const c of (candData ?? []) as PerfRow[]) {
      counts.set(c.job_opening_id, (counts.get(c.job_opening_id) ?? 0) + 1);
    }
  }

  return {
    data: rows.map((row) => mapJobRow(row, counts.get(row.id) ?? 0)),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getJobOpeningById(
  supabase: AuthSupabaseClient,
  organizationId: string,
  id: string,
): Promise<JobOpeningItem | null> {
  const { data, error } = await fromHrms(supabase, "recruitment_job_openings")
    .select(
      `id, title, department_id, designation_id, employment_type_id, experience_min, experience_max,
      salary_min, salary_max, open_positions, location, work_mode, hiring_manager_id, required_skills,
      job_description, job_status, created_at,
      departments:department_id(name),
      designations:designation_id(title),
      employment_types:employment_type_id(name),
      hiring_manager:hiring_manager_id(first_name, last_name)`,
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapJobRow(data as PerfRow);
}

function mapCandidateRow(row: PerfRow): CandidateListItem {
  const job = unwrapRelation(row.job) ?? unwrapRelation(row.recruitment_job_openings);
  const dept = unwrapRelation(job?.departments ?? null);
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: formatEmployeeName(row.first_name, row.last_name),
    email: row.email,
    phone: row.phone,
    experienceYears: row.experience_years != null ? Number(row.experience_years) : null,
    skills: row.skills ?? [],
    currentCompany: row.current_company,
    currentCtc: row.current_ctc != null ? Number(row.current_ctc) : null,
    expectedCtc: row.expected_ctc != null ? Number(row.expected_ctc) : null,
    noticePeriodDays: row.notice_period_days,
    source: row.source,
    stage: row.stage,
    jobOpeningId: row.job_opening_id,
    jobTitle: job?.title ?? "—",
    departmentName: dept?.name ?? null,
    resumePath: row.resume_path,
    photoPath: row.photo_path,
    notes: row.notes,
    employeeId: row.employee_id,
    createdAt: row.created_at,
  };
}

export async function listCandidates(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: unknown,
): Promise<CandidateListResult> {
  const parsed = candidateListParamsSchema.parse(params);
  const { page, pageSize, search, departmentId, jobOpeningId, stage, source } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;
  await archiveRejectedCandidates(supabase, organizationId).catch(() => 0);

  let query = fromHrms(supabase, "recruitment_candidates")
    .select(
      `id, first_name, last_name, email, phone, experience_years, skills, current_company,
      current_ctc, expected_ctc, notice_period_days, source, stage, job_opening_id, resume_path,
      photo_path, notes, employee_id, created_at,
      job:job_opening_id!inner(title, department_id, departments:department_id(name))`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (jobOpeningId) query = query.eq("job_opening_id", jobOpeningId);
  if (stage) query = query.eq("stage", stage);
  if (source) query = query.eq("source", source);
  if (departmentId) query = query.eq("job.department_id", departmentId);
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: ((data ?? []) as PerfRow[]).map(mapCandidateRow),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getCandidateById(
  supabase: AuthSupabaseClient,
  organizationId: string,
  id: string,
): Promise<CandidateDetail | null> {
  const { data, error } = await fromHrms(supabase, "recruitment_candidates")
    .select(
      `id, first_name, last_name, email, phone, experience_years, skills, current_company,
      current_ctc, expected_ctc, notice_period_days, source, stage, job_opening_id, resume_path,
      photo_path, notes, employee_id, created_at,
      job:job_opening_id(title, department_id, departments:department_id(name))`,
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const [timelineRes, interviewsRes, offersRes] = await Promise.all([
    fromHrms(supabase, "recruitment_candidate_timeline")
      .select("id, event_type, title, description, created_at")
      .eq("candidate_id", id)
      .order("created_at", { ascending: false }),
    fromHrms(supabase, "recruitment_interviews")
      .select(
        `id, candidate_id, job_opening_id, interviewer_employee_id, round_name, interview_date,
        interview_time, meeting_link, interview_type, interview_status, rating, comments,
        recommendation, created_at,
        candidate:candidate_id(first_name, last_name),
        job:job_opening_id(title),
        interviewer:interviewer_employee_id(first_name, last_name)`,
      )
      .eq("candidate_id", id)
      .is("deleted_at", null)
      .order("interview_date", { ascending: false }),
    fromHrms(supabase, "recruitment_offers")
      .select(
        `id, candidate_id, job_opening_id, department_id, designation_id, branch_id,
        employment_type_id, reporting_manager_id, salary, joining_date, offer_letter_path,
        offer_status, expires_at, employee_id, notes, created_at,
        candidate:candidate_id(first_name, last_name, email),
        job:job_opening_id(title),
        departments:department_id(name),
        designations:designation_id(title),
        branches:branch_id(name),
        employment_types:employment_type_id(name),
        manager:reporting_manager_id(first_name, last_name)`,
      )
      .eq("candidate_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const base = mapCandidateRow(data as PerfRow);
  return {
    ...base,
    timeline: ((timelineRes.data ?? []) as PerfRow[]).map((row) => ({
      id: row.id,
      eventType: row.event_type,
      title: row.title,
      description: row.description,
      createdAt: row.created_at,
    })),
    interviews: ((interviewsRes.data ?? []) as PerfRow[]).map(mapInterviewRow),
    offers: ((offersRes.data ?? []) as PerfRow[]).map(mapOfferRow),
  };
}

function mapInterviewRow(row: PerfRow): InterviewListItem {
  const candidate = unwrapRelation(row.candidate);
  const job = unwrapRelation(row.job);
  const interviewer = unwrapRelation(row.interviewer);
  return {
    id: row.id,
    candidateId: row.candidate_id,
    candidateName: candidate
      ? formatEmployeeName(candidate.first_name, candidate.last_name)
      : "—",
    jobOpeningId: row.job_opening_id,
    jobTitle: job?.title ?? "—",
    interviewerEmployeeId: row.interviewer_employee_id,
    interviewerName: interviewer
      ? formatEmployeeName(interviewer.first_name, interviewer.last_name)
      : "—",
    roundName: row.round_name,
    interviewDate: row.interview_date,
    interviewTime: String(row.interview_time).slice(0, 5),
    meetingLink: row.meeting_link,
    interviewType: row.interview_type,
    interviewStatus: row.interview_status,
    rating: row.rating,
    comments: row.comments,
    recommendation: row.recommendation,
    createdAt: row.created_at,
  };
}

export async function listInterviews(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: unknown,
): Promise<InterviewListResult> {
  const parsed = interviewListParamsSchema.parse(params);
  const { page, pageSize, search, jobOpeningId, interviewStatus, interviewerId, dateFrom, dateTo } =
    parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = fromHrms(supabase, "recruitment_interviews")
    .select(
      `id, candidate_id, job_opening_id, interviewer_employee_id, round_name, interview_date,
      interview_time, meeting_link, interview_type, interview_status, rating, comments,
      recommendation, created_at,
      candidate:candidate_id!inner(first_name, last_name),
      job:job_opening_id(title),
      interviewer:interviewer_employee_id(first_name, last_name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("interview_date", { ascending: false })
    .range(from, to);

  if (jobOpeningId) query = query.eq("job_opening_id", jobOpeningId);
  if (interviewStatus) query = query.eq("interview_status", interviewStatus);
  if (interviewerId) query = query.eq("interviewer_employee_id", interviewerId);
  if (dateFrom) query = query.gte("interview_date", dateFrom);
  if (dateTo) query = query.lte("interview_date", dateTo);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as PerfRow[];
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((row) => {
      const candidate = unwrapRelation(row.candidate);
      const name = candidate
        ? formatEmployeeName(candidate.first_name, candidate.last_name).toLowerCase()
        : "";
      return name.includes(q) || String(row.round_name ?? "").toLowerCase().includes(q);
    });
  }

  return {
    data: rows.map(mapInterviewRow),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

function mapOfferRow(row: PerfRow): OfferListItem {
  const candidate = unwrapRelation(row.candidate);
  const job = unwrapRelation(row.job);
  const dept = unwrapRelation(row.departments);
  const desig = unwrapRelation(row.designations);
  const branch = unwrapRelation(row.branches);
  const empType = unwrapRelation(row.employment_types);
  const manager = unwrapRelation(row.manager);
  return {
    id: row.id,
    candidateId: row.candidate_id,
    candidateName: candidate
      ? formatEmployeeName(candidate.first_name, candidate.last_name)
      : "—",
    candidateEmail: candidate?.email ?? "",
    jobOpeningId: row.job_opening_id,
    jobTitle: job?.title ?? "—",
    departmentId: row.department_id,
    departmentName: dept?.name ?? null,
    designationId: row.designation_id,
    designationTitle: desig?.title ?? null,
    branchId: row.branch_id,
    branchName: branch?.name ?? null,
    employmentTypeId: row.employment_type_id,
    employmentTypeName: empType?.name ?? null,
    reportingManagerId: row.reporting_manager_id,
    reportingManagerName: manager
      ? formatEmployeeName(manager.first_name, manager.last_name)
      : null,
    salary: Number(row.salary),
    joiningDate: row.joining_date,
    offerLetterPath: row.offer_letter_path,
    offerStatus: row.offer_status,
    expiresAt: row.expires_at,
    employeeId: row.employee_id,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function listOffers(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: unknown,
): Promise<OfferListResult> {
  const parsed = offerListParamsSchema.parse(params);
  const { page, pageSize, search, jobOpeningId, offerStatus, departmentId } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = fromHrms(supabase, "recruitment_offers")
    .select(
      `id, candidate_id, job_opening_id, department_id, designation_id, branch_id,
      employment_type_id, reporting_manager_id, salary, joining_date, offer_letter_path,
      offer_status, expires_at, employee_id, notes, created_at,
      candidate:candidate_id!inner(first_name, last_name, email),
      job:job_opening_id(title),
      departments:department_id(name),
      designations:designation_id(title),
      branches:branch_id(name),
      employment_types:employment_type_id(name),
      manager:reporting_manager_id(first_name, last_name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (jobOpeningId) query = query.eq("job_opening_id", jobOpeningId);
  if (offerStatus) query = query.eq("offer_status", offerStatus);
  if (departmentId) query = query.eq("department_id", departmentId);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as PerfRow[];
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((row) => {
      const candidate = unwrapRelation(row.candidate);
      const name = candidate
        ? formatEmployeeName(candidate.first_name, candidate.last_name).toLowerCase()
        : "";
      return name.includes(q) || String(candidate?.email ?? "").toLowerCase().includes(q);
    });
  }

  return {
    data: rows.map(mapOfferRow),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export type { RecruitmentSettings };
