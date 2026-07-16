import { addDays, differenceInCalendarDays, format, startOfWeek } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  CANDIDATE_PIPELINE,
  CANDIDATE_STAGE_LABELS,
} from "@/lib/recruitment/constants";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import { createSignedStorageUrl } from "@/lib/employees/services/employee-mutations";
import { ceoRecruitmentListParamsSchema } from "@/lib/validations/ceo-recruitment";
import type { UserProfile } from "@/types/auth";
import type { CandidateStage } from "@/types/recruitment";
import type {
  CeoRecruitmentCandidateDetail,
  CeoRecruitmentCandidateListResult,
  CeoRecruitmentCandidateRow,
  CeoRecruitmentFilterLookups,
  CeoRecruitmentInsights,
  CeoRecruitmentInterviewRow,
  CeoRecruitmentJobRow,
  CeoRecruitmentKpis,
  CeoRecruitmentListParams,
  CeoRecruitmentPageData,
  CeoRecruitmentPipelineStage,
} from "@/types/ceo-recruitment";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const RECRUITMENT_BUCKET = "recruitment";

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return unwrapRelation(value as T | T[] | null);
}

function parseParams(params: CeoRecruitmentListParams) {
  return ceoRecruitmentListParamsSchema.parse(params);
}

function candidateCode(id: string) {
  return `C-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function weekRange() {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 });
  const end = addDays(start, 6);
  return {
    today: format(today, "yyyy-MM-dd"),
    weekStart: format(start, "yyyy-MM-dd"),
    weekEnd: format(end, "yyyy-MM-dd"),
    monthStart: format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd"),
  };
}

export async function getCeoRecruitmentKpis(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoRecruitmentKpis> {
  const organizationId = profile.employee.organizationId;
  const { today, weekStart, weekEnd, monthStart } = weekRange();

  const [jobs, candidates, interviews, offers] = await Promise.all([
    fromHrms(supabase, "recruitment_job_openings")
      .select("id, job_status, open_positions")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_candidates")
      .select("id, stage, joined_at, created_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("archived_at", null),
    fromHrms(supabase, "recruitment_interviews")
      .select("id, interview_date, interview_status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("interview_date", weekStart)
      .lte("interview_date", weekEnd),
    fromHrms(supabase, "recruitment_offers")
      .select("id, offer_status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
  ]);

  if (jobs.error) throw new Error(jobs.error.message);
  if (candidates.error) throw new Error(candidates.error.message);
  if (interviews.error) throw new Error(interviews.error.message);
  if (offers.error) throw new Error(offers.error.message);

  const jobRows = (jobs.data ?? []) as LooseRow[];
  const candidateRows = (candidates.data ?? []) as LooseRow[];
  const interviewRows = (interviews.data ?? []) as LooseRow[];
  const offerRows = (offers.data ?? []) as LooseRow[];

  const openPositions = jobRows
    .filter((row) => row.job_status === "open")
    .reduce((sum, row) => sum + Number(row.open_positions ?? 0), 0);

  const interviewsToday = interviewRows.filter(
    (row) => row.interview_date === today && row.interview_status === "scheduled",
  ).length;
  const interviewsThisWeek = interviewRows.filter((row) =>
    ["scheduled", "completed"].includes(row.interview_status),
  ).length;

  const offersPending = offerRows.filter((row) =>
    ["draft", "sent"].includes(row.offer_status),
  ).length;
  const offersAccepted = offerRows.filter((row) => row.offer_status === "accepted").length;
  const offersDecided = offerRows.filter((row) =>
    ["accepted", "rejected", "expired"].includes(row.offer_status),
  ).length;

  const hiresThisMonth = candidateRows.filter(
    (row) =>
      row.stage === "joined" &&
      row.joined_at &&
      String(row.joined_at).slice(0, 10) >= monthStart,
  ).length;

  const joined = candidateRows.filter(
    (row) => row.stage === "joined" && row.joined_at && row.created_at,
  );
  const averageTimeToHireDays =
    joined.length > 0
      ? Math.round(
          joined.reduce((sum, row) => {
            const start = new Date(row.created_at).getTime();
            const end = new Date(row.joined_at).getTime();
            return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
          }, 0) / joined.length,
        )
      : 0;

  const rejected = candidateRows.filter((row) => row.stage === "rejected").length;
  const decidedOutcomes = joined.length + rejected;
  const recruitmentSuccessRate =
    decidedOutcomes > 0 ? Math.round((joined.length / decidedOutcomes) * 100) : 0;
  const offerAcceptanceRate =
    offersDecided > 0 ? Math.round((offersAccepted / offersDecided) * 100) : 0;

  return {
    openPositions,
    totalCandidates: candidateRows.length,
    interviewsToday,
    interviewsThisWeek,
    offersPending,
    offersAccepted,
    hiresThisMonth,
    averageTimeToHireDays,
    offerAcceptanceRate,
    recruitmentSuccessRate,
  };
}

export async function getCeoRecruitmentPipeline(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoRecruitmentListParams = {},
): Promise<CeoRecruitmentPipelineStage[]> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams({ ...filters, page: 1, pageSize: 10 });

  let query = fromHrms(supabase, "recruitment_candidates")
    .select(
      "id, stage, job:job_opening_id!inner(department_id, employment_type_id, hiring_manager_id)",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .is("archived_at", null);

  if (parsed.departmentId) query = query.eq("job.department_id", parsed.departmentId);
  if (parsed.jobOpeningId) query = query.eq("job_opening_id", parsed.jobOpeningId);
  if (parsed.recruiterId) query = query.eq("job.hiring_manager_id", parsed.recruiterId);
  if (parsed.employmentTypeId) {
    query = query.eq("job.employment_type_id", parsed.employmentTypeId);
  }
  if (parsed.dateFrom) query = query.gte("created_at", `${parsed.dateFrom}T00:00:00`);
  if (parsed.dateTo) query = query.lte("created_at", `${parsed.dateTo}T23:59:59`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LooseRow[];
  const counts = CANDIDATE_PIPELINE.map((stage) => ({
    stage,
    count: rows.filter((row) => row.stage === stage).length,
  }));

  const pipelineLabels: Partial<Record<CandidateStage, string>> = {
    technical: "Technical Interview",
    hr: "HR Interview",
    ceo: "CEO Interview",
  };

  return counts.map((item, index) => {
    const previous = index === 0 ? item.count : counts[index - 1]?.count ?? 0;
    const conversionRate =
      index === 0
        ? 100
        : previous > 0
          ? Math.round((item.count / previous) * 1000) / 10
          : 0;
    return {
      stage: item.stage,
      label: pipelineLabels[item.stage] ?? CANDIDATE_STAGE_LABELS[item.stage],
      count: item.count,
      conversionRate,
    };
  });
}

export async function getCeoRecruitmentFilterLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<CeoRecruitmentFilterLookups> {
  const [candidates, departments, jobs, employmentTypes] = await Promise.all([
    fromHrms(supabase, "recruitment_candidates")
      .select("id, first_name, last_name, candidate_code")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("first_name")
      .limit(300),
    fromHrms(supabase, "departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "recruitment_job_openings")
      .select(
        "id, title, hiring_manager_id, hiring_manager:hiring_manager_id(first_name, last_name)",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("title"),
    fromHrms(supabase, "employment_types")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (candidates.error) throw new Error(candidates.error.message);
  if (departments.error) throw new Error(departments.error.message);
  if (jobs.error) throw new Error(jobs.error.message);
  if (employmentTypes.error) throw new Error(employmentTypes.error.message);

  const recruiters = new Map<string, { id: string; label: string }>();
  for (const row of (jobs.data ?? []) as LooseRow[]) {
    const manager = unwrap(row.hiring_manager);
    if (!row.hiring_manager_id || !manager) continue;
    recruiters.set(row.hiring_manager_id, {
      id: row.hiring_manager_id,
      label: formatEmployeeName(manager.first_name, manager.last_name),
    });
  }

  return {
    candidates: ((candidates.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: `${row.first_name} ${row.last_name} · ${row.candidate_code}`,
    })),
    departments: ((departments.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    jobs: ((jobs.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.title,
    })),
    recruiters: [...recruiters.values()].sort((a, b) => a.label.localeCompare(b.label)),
    employmentTypes: ((employmentTypes.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
  };
}

export async function listCeoRecruitmentCandidates(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoRecruitmentListParams,
): Promise<CeoRecruitmentCandidateListResult> {
  const parsed = parseParams(params);
  const organizationId = profile.employee.organizationId;
  const from = (parsed.page - 1) * parsed.pageSize;
  const to = from + parsed.pageSize - 1;

  let query = fromHrms(supabase, "recruitment_candidates")
    .select(
      `id, first_name, last_name, email, phone, experience_years, expected_ctc, stage,
      job_opening_id, photo_path, created_at, candidate_code,
      job:job_opening_id!inner(
        title, department_id, employment_type_id, hiring_manager_id,
        departments:department_id(name),
        hiring_manager:hiring_manager_id(first_name, last_name)
      )`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (parsed.candidateId) query = query.eq("id", parsed.candidateId);
  if (parsed.jobOpeningId) query = query.eq("job_opening_id", parsed.jobOpeningId);
  if (parsed.stage) query = query.eq("stage", parsed.stage);
  if (parsed.departmentId) query = query.eq("job.department_id", parsed.departmentId);
  if (parsed.recruiterId) query = query.eq("job.hiring_manager_id", parsed.recruiterId);
  if (parsed.employmentTypeId) {
    query = query.eq("job.employment_type_id", parsed.employmentTypeId);
  }
  if (parsed.dateFrom) query = query.gte("created_at", `${parsed.dateFrom}T00:00:00`);
  if (parsed.dateTo) query = query.lte("created_at", `${parsed.dateTo}T23:59:59`);
  if (!parsed.candidateId && parsed.search) {
    query = query.or(
      `first_name.ilike.%${parsed.search}%,last_name.ilike.%${parsed.search}%,email.ilike.%${parsed.search}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LooseRow[];
  const candidateIds = rows.map((row) => row.id as string);

  const interviewByCandidate = new Map<string, string>();
  if (candidateIds.length > 0) {
    const { data: interviews, error: interviewError } = await fromHrms(
      supabase,
      "recruitment_interviews",
    )
      .select("candidate_id, interview_date, interview_status")
      .eq("organization_id", organizationId)
      .in("candidate_id", candidateIds)
      .is("deleted_at", null)
      .order("interview_date", { ascending: false });

    if (interviewError) throw new Error(interviewError.message);

    for (const row of (interviews ?? []) as LooseRow[]) {
      if (!interviewByCandidate.has(row.candidate_id)) {
        interviewByCandidate.set(row.candidate_id, row.interview_date);
      }
    }
  }

  return {
    data: rows.map((row): CeoRecruitmentCandidateRow => {
      const job = unwrap(row.job);
      const department = unwrap(job?.departments);
      const recruiter = unwrap(job?.hiring_manager);
      const stage = row.stage as CandidateStage;

      return {
        id: row.id,
        candidateCode: row.candidate_code || candidateCode(row.id),
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: formatEmployeeName(row.first_name, row.last_name),
        email: row.email,
        phone: row.phone,
        jobOpeningId: row.job_opening_id,
        jobTitle: job?.title ?? "—",
        departmentId: job?.department_id ?? null,
        departmentName: department?.name ?? null,
        recruiterId: job?.hiring_manager_id ?? null,
        recruiterName: recruiter
          ? formatEmployeeName(recruiter.first_name, recruiter.last_name)
          : null,
        stage,
        interviewDate: interviewByCandidate.get(row.id) ?? null,
        experienceYears:
          row.experience_years != null ? Number(row.experience_years) : null,
        expectedCtc: row.expected_ctc != null ? Number(row.expected_ctc) : null,
        statusLabel: CANDIDATE_STAGE_LABELS[stage] ?? stage,
        photoPath: row.photo_path,
        createdAt: row.created_at,
      };
    }),
    total: count ?? 0,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export async function listCeoRecruitmentInterviews(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoRecruitmentListParams = {},
): Promise<CeoRecruitmentInterviewRow[]> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams({ ...filters, page: 1, pageSize: 10 });
  const { today } = weekRange();

  let query = fromHrms(supabase, "recruitment_interviews")
    .select(
      `id, candidate_id, interview_date, interview_time, interview_type, interview_status,
      candidate:candidate_id(first_name, last_name),
      job:job_opening_id!inner(
        title, department_id, employment_type_id, hiring_manager_id,
        departments:department_id(name)
      ),
      interviewer:interviewer_employee_id(first_name, last_name)`,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("interview_date", today)
    .order("interview_date", { ascending: true })
    .order("interview_time", { ascending: true })
    .limit(20);

  if (parsed.departmentId) query = query.eq("job.department_id", parsed.departmentId);
  if (parsed.jobOpeningId) query = query.eq("job_opening_id", parsed.jobOpeningId);
  if (parsed.recruiterId) query = query.eq("job.hiring_manager_id", parsed.recruiterId);
  if (parsed.employmentTypeId) {
    query = query.eq("job.employment_type_id", parsed.employmentTypeId);
  }
  if (parsed.dateFrom) query = query.gte("interview_date", parsed.dateFrom);
  if (parsed.dateTo) query = query.lte("interview_date", parsed.dateTo);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as LooseRow[]).map((row) => {
    const candidate = unwrap(row.candidate);
    const job = unwrap(row.job);
    const department = unwrap(job?.departments);
    const interviewer = unwrap(row.interviewer);

    return {
      id: row.id,
      candidateId: row.candidate_id,
      candidateName: candidate
        ? formatEmployeeName(candidate.first_name, candidate.last_name)
        : "—",
      jobTitle: job?.title ?? "—",
      departmentName: department?.name ?? null,
      interviewerName: interviewer
        ? formatEmployeeName(interviewer.first_name, interviewer.last_name)
        : "—",
      interviewDate: row.interview_date,
      interviewTime: String(row.interview_time).slice(0, 5),
      interviewType: row.interview_type,
      interviewStatus: row.interview_status,
    };
  });
}

export async function listCeoRecruitmentJobs(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoRecruitmentListParams = {},
): Promise<CeoRecruitmentJobRow[]> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams({ ...filters, page: 1, pageSize: 10 });

  let query = fromHrms(supabase, "recruitment_job_openings")
    .select(
      `id, title, open_positions, job_status, created_at, department_id, employment_type_id,
      hiring_manager_id,
      departments:department_id(name),
      employment_types:employment_type_id(name),
      hiring_manager:hiring_manager_id(first_name, last_name)`,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .in("job_status", ["open", "paused"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (parsed.departmentId) query = query.eq("department_id", parsed.departmentId);
  if (parsed.jobOpeningId) query = query.eq("id", parsed.jobOpeningId);
  if (parsed.recruiterId) query = query.eq("hiring_manager_id", parsed.recruiterId);
  if (parsed.employmentTypeId) query = query.eq("employment_type_id", parsed.employmentTypeId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LooseRow[];
  const jobIds = rows.map((row) => row.id as string);
  const candidateCounts = new Map<string, number>();

  if (jobIds.length > 0) {
    const { data: candidates } = await fromHrms(supabase, "recruitment_candidates")
      .select("job_opening_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .in("job_opening_id", jobIds);

    for (const row of (candidates ?? []) as LooseRow[]) {
      candidateCounts.set(
        row.job_opening_id,
        (candidateCounts.get(row.job_opening_id) ?? 0) + 1,
      );
    }
  }

  const today = new Date();
  return rows.map((row) => {
    const department = unwrap(row.departments);
    const employmentType = unwrap(row.employment_types);
    const manager = unwrap(row.hiring_manager);

    return {
      id: row.id,
      title: row.title,
      departmentName: department?.name ?? null,
      openPositions: Number(row.open_positions ?? 0),
      candidateCount: candidateCounts.get(row.id) ?? 0,
      hiringManagerName: manager
        ? formatEmployeeName(manager.first_name, manager.last_name)
        : null,
      jobStatus: row.job_status,
      daysOpen: Math.max(
        0,
        differenceInCalendarDays(today, new Date(row.created_at)),
      ),
      employmentTypeName: employmentType?.name ?? null,
      createdAt: row.created_at,
    };
  });
}

export async function getCeoRecruitmentInsights(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoRecruitmentListParams = {},
): Promise<CeoRecruitmentInsights> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams({ ...filters, page: 1, pageSize: 10 });
  const pipeline = await getCeoRecruitmentPipeline(supabase, profile, parsed);

  const [candidatesRes, interviewsRes, offersRes, jobsRes] = await Promise.all([
    fromHrms(supabase, "recruitment_candidates")
      .select(
        `id, stage, joined_at, created_at, job_opening_id,
        job:job_opening_id!inner(
          department_id, hiring_manager_id, employment_type_id,
          departments:department_id(name),
          hiring_manager:hiring_manager_id(first_name, last_name)
        )`,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("archived_at", null),
    fromHrms(supabase, "recruitment_interviews")
      .select("id, interview_status, recommendation")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_offers")
      .select("id, offer_status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_job_openings")
      .select("id, job_status, department_id, departments:department_id(name)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
  ]);

  if (candidatesRes.error) throw new Error(candidatesRes.error.message);

  let candidateRows = (candidatesRes.data ?? []) as LooseRow[];
  if (parsed.departmentId) {
    candidateRows = candidateRows.filter(
      (row) => unwrap(row.job)?.department_id === parsed.departmentId,
    );
  }
  if (parsed.recruiterId) {
    candidateRows = candidateRows.filter(
      (row) => unwrap(row.job)?.hiring_manager_id === parsed.recruiterId,
    );
  }
  if (parsed.employmentTypeId) {
    candidateRows = candidateRows.filter(
      (row) => unwrap(row.job)?.employment_type_id === parsed.employmentTypeId,
    );
  }
  if (parsed.jobOpeningId) {
    candidateRows = candidateRows.filter((row) => {
      const job = unwrap(row.job);
      return job && row.job_opening_id === parsed.jobOpeningId;
    });
  }

  const hiringByDepartment = new Map<string, number>();
  const joinedByDepartment = new Map<string, number>();
  const recruiterPerformance = new Map<string, number>();
  const monthlyHiring = new Map<string, number>();

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    monthlyHiring.set(format(date, "yyyy-MM"), 0);
  }

  for (const row of candidateRows) {
    const job = unwrap(row.job);
    const department = unwrap(job?.departments)?.name ?? "Unassigned";
    hiringByDepartment.set(department, (hiringByDepartment.get(department) ?? 0) + 1);

    if (row.stage !== "joined") continue;

    joinedByDepartment.set(department, (joinedByDepartment.get(department) ?? 0) + 1);

    const manager = unwrap(job?.hiring_manager);
    if (manager) {
      const label = formatEmployeeName(manager.first_name, manager.last_name);
      recruiterPerformance.set(label, (recruiterPerformance.get(label) ?? 0) + 1);
    }

    if (row.joined_at) {
      const key = String(row.joined_at).slice(0, 7);
      if (monthlyHiring.has(key)) {
        monthlyHiring.set(key, (monthlyHiring.get(key) ?? 0) + 1);
      }
    }
  }

  const interviewRows = (interviewsRes.data ?? []) as LooseRow[];
  const completedInterviews = interviewRows.filter(
    (row) => row.interview_status === "completed",
  );
  const positiveInterviews = completedInterviews.filter((row) =>
    ["next_round", "offer"].includes(row.recommendation),
  );
  const interviewSuccessRate =
    completedInterviews.length > 0
      ? Math.round((positiveInterviews.length / completedInterviews.length) * 100)
      : 0;

  const offerRows = (offersRes.data ?? []) as LooseRow[];
  const accepted = offerRows.filter((row) => row.offer_status === "accepted").length;
  const decided = offerRows.filter((row) =>
    ["accepted", "rejected", "expired"].includes(row.offer_status),
  ).length;
  const offerAcceptanceRate =
    decided > 0 ? Math.round((accepted / decided) * 100) : 0;

  const joined = candidateRows.filter(
    (row) => row.stage === "joined" && row.joined_at && row.created_at,
  );
  const averageHiringTimeDays =
    joined.length > 0
      ? Math.round(
          joined.reduce((sum, row) => {
            const start = new Date(row.created_at).getTime();
            const end = new Date(row.joined_at).getTime();
            return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
          }, 0) / joined.length,
        )
      : 0;

  const jobRows = (jobsRes.data ?? []) as LooseRow[];
  const openCount = jobRows.filter((row) => row.job_status === "open").length;
  const closedCount = jobRows.filter((row) => row.job_status === "closed").length;

  const topHiringDepartments = [...joinedByDepartment.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return {
    hiringByDepartment: [...hiringByDepartment.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    hiringTrend: [...monthlyHiring.entries()].map(([label, value]) => ({ label, value })),
    funnel: pipeline.map((item) => ({ label: item.label, value: item.count })),
    interviewSuccessRate,
    offerAcceptanceRate,
    averageHiringTimeDays,
    openVsClosed: [
      { label: "Open", value: openCount },
      { label: "Closed", value: closedCount },
    ],
    topHiringDepartments,
    recruiterPerformance: [...recruiterPerformance.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
  };
}

export async function getCeoRecruitmentCandidateDetail(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  candidateId: string,
): Promise<CeoRecruitmentCandidateDetail | null> {
  const organizationId = profile.employee.organizationId;

  const { data, error } = await fromHrms(supabase, "recruitment_candidates")
    .select(
      `id, first_name, last_name, email, phone, experience_years, skills, current_company,
      expected_ctc, stage, photo_path, resume_path, notes, created_at, candidate_code,
      job:job_opening_id(
        title, department_id, hiring_manager_id,
        departments:department_id(name),
        hiring_manager:hiring_manager_id(first_name, last_name)
      )`,
    )
    .eq("id", candidateId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as LooseRow;
  const job = unwrap(row.job);
  const department = unwrap(job?.departments);
  const recruiter = unwrap(job?.hiring_manager);

  const [timelineRes, interviewsRes, offersRes] = await Promise.all([
    fromHrms(supabase, "recruitment_candidate_timeline")
      .select("id, title, description, created_at")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false }),
    fromHrms(supabase, "recruitment_interviews")
      .select(
        `id, round_name, interview_date, interview_time, interview_status, rating, comments,
        recommendation, interviewer:interviewer_employee_id(first_name, last_name)`,
      )
      .eq("candidate_id", candidateId)
      .is("deleted_at", null)
      .order("interview_date", { ascending: false }),
    fromHrms(supabase, "recruitment_offers")
      .select("offer_status, joining_date")
      .eq("candidate_id", candidateId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (timelineRes.error) throw new Error(timelineRes.error.message);
  if (interviewsRes.error) throw new Error(interviewsRes.error.message);
  if (offersRes.error) throw new Error(offersRes.error.message);

  let photoUrl: string | null = null;
  let resumeUrl: string | null = null;
  if (row.photo_path) {
    photoUrl = await createSignedStorageUrl(supabase, RECRUITMENT_BUCKET, row.photo_path).catch(
      () => null,
    );
  }
  if (row.resume_path) {
    resumeUrl = await createSignedStorageUrl(supabase, RECRUITMENT_BUCKET, row.resume_path).catch(
      () => null,
    );
  }

  const latestOffer = ((offersRes.data ?? []) as LooseRow[])[0];

  return {
    id: row.id,
    candidateCode: row.candidate_code || candidateCode(row.id),
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: formatEmployeeName(row.first_name, row.last_name),
    email: row.email,
    phone: row.phone,
    experienceYears: row.experience_years != null ? Number(row.experience_years) : null,
    skills: Array.isArray(row.skills) ? row.skills : [],
    currentCompany: row.current_company,
    education: null,
    photoPath: row.photo_path,
    resumePath: row.resume_path,
    photoUrl,
    resumeUrl,
    stage: row.stage,
    jobTitle: job?.title ?? "—",
    departmentName: department?.name ?? null,
    recruiterName: recruiter
      ? formatEmployeeName(recruiter.first_name, recruiter.last_name)
      : null,
    expectedCtc: row.expected_ctc != null ? Number(row.expected_ctc) : null,
    notes: row.notes,
    timeline: ((timelineRes.data ?? []) as LooseRow[]).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      createdAt: item.created_at,
    })),
    interviews: ((interviewsRes.data ?? []) as LooseRow[]).map((item) => {
      const interviewer = unwrap(item.interviewer);
      return {
        id: item.id,
        roundName: item.round_name,
        interviewDate: item.interview_date,
        interviewTime: String(item.interview_time).slice(0, 5),
        interviewerName: interviewer
          ? formatEmployeeName(interviewer.first_name, interviewer.last_name)
          : "—",
        interviewStatus: item.interview_status,
        rating: item.rating,
        comments: item.comments,
        recommendation: item.recommendation,
      };
    }),
    offerStatus: latestOffer?.offer_status ?? null,
    expectedJoiningDate: latestOffer?.joining_date ?? null,
  };
}

export async function getCeoRecruitmentPageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoRecruitmentListParams,
): Promise<CeoRecruitmentPageData> {
  const parsed = parseParams(params);
  const organizationId = profile.employee.organizationId;

  const [kpis, pipeline, candidates, interviews, jobs, insights, lookups] =
    await Promise.all([
      getCeoRecruitmentKpis(supabase, profile),
      getCeoRecruitmentPipeline(supabase, profile, parsed),
      listCeoRecruitmentCandidates(supabase, profile, parsed),
      listCeoRecruitmentInterviews(supabase, profile, parsed),
      listCeoRecruitmentJobs(supabase, profile, parsed),
      getCeoRecruitmentInsights(supabase, profile, parsed),
      getCeoRecruitmentFilterLookups(supabase, organizationId),
    ]);

  return {
    kpis,
    pipeline,
    candidates,
    interviews,
    jobs,
    insights,
    lookups,
  };
}
