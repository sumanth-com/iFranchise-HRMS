import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  ManagerRecruitmentContext,
  ManagerTeamRecruitmentPageData,
  TeamRecruitmentAnalytics,
  TeamRecruitmentCandidateListResult,
  TeamRecruitmentCandidateRow,
  TeamRecruitmentJobListResult,
  TeamRecruitmentJobRow,
  TeamRecruitmentListParams,
  TeamRecruitmentLookups,
  TeamRecruitmentSummary,
} from "@/types/manager-recruitment";
import type { CandidateStage } from "@/types/recruitment";
import {
  CANDIDATE_STAGE_LABELS,
  INTERVIEW_STATUS_LABELS,
} from "@/lib/recruitment/constants";
import {
  formatEmployeeName,
  fromHrms,
  type PerfRow,
  unwrapRelation,
} from "@/lib/recruitment/services/recruitment-utils";
import { teamRecruitmentListParamsSchema } from "@/lib/validations/manager-recruitment";
import { getManagerTeamScope } from "@/lib/manager/services/team-queries";
import { getManagerRecruitmentContext } from "@/lib/manager/services/manager-recruitment-context";

async function getJobIdsForDepartments(
  supabase: AuthSupabaseClient,
  organizationId: string,
  departmentIds: string[],
): Promise<string[]> {
  if (!departmentIds.length) return [];

  const { data, error } = await fromHrms(supabase, "recruitment_job_openings")
    .select("id")
    .eq("organization_id", organizationId)
    .in("department_id", departmentIds)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return ((data ?? []) as PerfRow[]).map((row) => row.id as string);
}

function emptySummary(): TeamRecruitmentSummary {
  return {
    openPositions: 0,
    candidatesAssigned: 0,
    interviewsToday: 0,
    pendingFeedback: 0,
    offersAwaitingApproval: 0,
    positionsFilled: 0,
  };
}

export async function getTeamRecruitmentSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
): Promise<TeamRecruitmentSummary> {
  const { organizationId, departmentIds, managerId } = context;
  if (!departmentIds.length) return emptySummary();

  const today = new Date().toISOString().slice(0, 10);
  const jobIds = await getJobIdsForDepartments(supabase, organizationId, departmentIds);
  if (!jobIds.length) return emptySummary();

  const [jobsResult, candidatesResult, interviewsResult, offersResult, filledResult] =
    await Promise.all([
      fromHrms(supabase, "recruitment_job_openings")
        .select("id, open_positions, job_status")
        .eq("organization_id", organizationId)
        .in("department_id", departmentIds)
        .is("deleted_at", null),
      fromHrms(supabase, "recruitment_candidates")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("job_opening_id", jobIds)
        .is("deleted_at", null)
        .is("archived_at", null)
        .not("stage", "in", '("joined","rejected")'),
      fromHrms(supabase, "recruitment_interviews")
        .select("id, interview_date, interview_status, interviewer_employee_id, rating")
        .eq("organization_id", organizationId)
        .in("job_opening_id", jobIds)
        .is("deleted_at", null),
      fromHrms(supabase, "recruitment_offers")
        .select("id, offer_status, notes")
        .eq("organization_id", organizationId)
        .in("job_opening_id", jobIds)
        .is("deleted_at", null),
      fromHrms(supabase, "recruitment_candidates")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("job_opening_id", jobIds)
        .eq("stage", "joined")
        .is("deleted_at", null),
    ]);

  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (candidatesResult.error) throw new Error(candidatesResult.error.message);
  if (interviewsResult.error) throw new Error(interviewsResult.error.message);
  if (offersResult.error) throw new Error(offersResult.error.message);
  if (filledResult.error) throw new Error(filledResult.error.message);

  const jobRows = (jobsResult.data ?? []) as PerfRow[];
  const interviewRows = (interviewsResult.data ?? []) as PerfRow[];
  const offerRows = (offersResult.data ?? []) as PerfRow[];

  const openPositions = jobRows
    .filter((job) => job.job_status === "open")
    .reduce((sum, job) => sum + Number(job.open_positions ?? 0), 0);

  const interviewsToday = interviewRows.filter(
    (interview) =>
      interview.interview_date === today && interview.interview_status === "scheduled",
  ).length;

  const pendingFeedback = interviewRows.filter((interview) => {
    if (interview.interviewer_employee_id !== managerId) return false;
    if (interview.interview_status !== "scheduled") return false;
    return String(interview.interview_date) <= today;
  }).length;

  const offersAwaitingApproval = offerRows.filter((offer) => {
    if (!["draft", "sent"].includes(String(offer.offer_status))) return false;
    if (!offer.notes) return true;
    try {
      const parsed = JSON.parse(String(offer.notes));
      return !parsed?.managerApproval;
    } catch {
      return true;
    }
  }).length;

  return {
    openPositions,
    candidatesAssigned: candidatesResult.count ?? 0,
    interviewsToday,
    pendingFeedback,
    offersAwaitingApproval,
    positionsFilled: filledResult.count ?? 0,
  };
}

function mapJobRow(
  row: PerfRow,
  applicationCount: number,
  interviewsCompleted: number,
  interviewsTotal: number,
  filledCount: number,
): TeamRecruitmentJobRow {
  const dept = unwrapRelation(row.departments);
  const hiringManager = unwrapRelation(row.hiring_manager);
  return {
    id: row.id,
    title: row.title,
    jobCode: row.job_code ?? null,
    departmentId: row.department_id ?? null,
    departmentName: dept?.name ?? null,
    hiringManagerId: row.hiring_manager_id ?? null,
    hiringManagerName: hiringManager
      ? formatEmployeeName(hiringManager.first_name, hiringManager.last_name)
      : null,
    vacancies: Number(row.open_positions ?? 0),
    applicationCount,
    interviewsCompleted,
    interviewsTotal,
    filledCount,
    hiringStatus: row.job_status,
  };
}

export async function listTeamRecruitmentJobs(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
  params: TeamRecruitmentListParams,
): Promise<TeamRecruitmentJobListResult> {
  const parsed = teamRecruitmentListParamsSchema.parse(params);
  const { page, pageSize, search, departmentId, employeeId } = parsed;
  const { organizationId, departmentIds } = context;

  if (!departmentIds.length) {
    return { data: [], total: 0, page, pageSize };
  }

  const scopedDepartmentIds = departmentId
    ? departmentIds.filter((id) => id === departmentId)
    : departmentIds;

  if (!scopedDepartmentIds.length) {
    return { data: [], total: 0, page, pageSize };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = fromHrms(supabase, "recruitment_job_openings")
    .select(
      `id, title, job_code, department_id, open_positions, job_status, hiring_manager_id,
      departments:department_id(name),
      hiring_manager:hiring_manager_id(first_name, last_name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .in("department_id", scopedDepartmentIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`title.ilike.%${search}%,job_code.ilike.%${search}%`);
  }
  if (employeeId) {
    query = query.eq("hiring_manager_id", employeeId);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PerfRow[];
  const jobIds = rows.map((row) => row.id as string);

  const counts = new Map<string, { applications: number; completed: number; total: number; filled: number }>();
  for (const id of jobIds) {
    counts.set(id, { applications: 0, completed: 0, total: 0, filled: 0 });
  }

  if (jobIds.length) {
    const [candidatesRes, interviewsRes, filledRes] = await Promise.all([
      fromHrms(supabase, "recruitment_candidates")
        .select("job_opening_id")
        .eq("organization_id", organizationId)
        .in("job_opening_id", jobIds)
        .is("deleted_at", null)
        .is("archived_at", null),
      fromHrms(supabase, "recruitment_interviews")
        .select("job_opening_id, interview_status")
        .eq("organization_id", organizationId)
        .in("job_opening_id", jobIds)
        .is("deleted_at", null),
      fromHrms(supabase, "recruitment_candidates")
        .select("job_opening_id")
        .eq("organization_id", organizationId)
        .in("job_opening_id", jobIds)
        .eq("stage", "joined")
        .is("deleted_at", null),
    ]);

    for (const row of (candidatesRes.data ?? []) as PerfRow[]) {
      const entry = counts.get(row.job_opening_id);
      if (entry) entry.applications += 1;
    }
    for (const row of (interviewsRes.data ?? []) as PerfRow[]) {
      const entry = counts.get(row.job_opening_id);
      if (!entry) continue;
      entry.total += 1;
      if (row.interview_status === "completed") entry.completed += 1;
    }
    for (const row of (filledRes.data ?? []) as PerfRow[]) {
      const entry = counts.get(row.job_opening_id);
      if (entry) entry.filled += 1;
    }
  }

  return {
    data: rows.map((row) => {
      const stats = counts.get(row.id) ?? { applications: 0, completed: 0, total: 0, filled: 0 };
      return mapJobRow(row, stats.applications, stats.completed, stats.total, stats.filled);
    }),
    total: count ?? 0,
    page,
    pageSize,
  };
}

function mapCandidateRow(row: PerfRow, managerId: string): TeamRecruitmentCandidateRow {
  const job = unwrapRelation(row.job);
  const dept = unwrapRelation(job?.departments ?? null);
  const hiringManager = unwrapRelation(job?.hiring_manager ?? null);
  const latestInterview = unwrapRelation(row.latest_interview);

  const interviewDate = latestInterview?.interview_date ?? null;
  const interviewStatus = latestInterview?.interview_status ?? null;
  const pendingFeedback =
    latestInterview?.interviewer_employee_id === managerId &&
    latestInterview?.interview_status === "scheduled" &&
    interviewDate !== null &&
    interviewDate <= new Date().toISOString().slice(0, 10);

  return {
    id: row.id,
    fullName: formatEmployeeName(row.first_name, row.last_name),
    email: row.email,
    appliedPosition: job?.title ?? "—",
    jobOpeningId: row.job_opening_id,
    experienceYears: row.experience_years != null ? Number(row.experience_years) : null,
    source: row.source,
    currentStage: row.stage,
    assignedRecruiterName: hiringManager
      ? formatEmployeeName(hiringManager.first_name, hiringManager.last_name)
      : null,
    interviewDate,
    interviewStatus,
    pendingFeedback: Boolean(pendingFeedback),
    createdAt: row.created_at,
  };
}

export async function listTeamRecruitmentCandidates(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
  params: TeamRecruitmentListParams,
): Promise<TeamRecruitmentCandidateListResult> {
  const parsed = teamRecruitmentListParamsSchema.parse(params);
  const {
    page,
    pageSize,
    search,
    employeeId,
    departmentId,
    jobOpeningId,
    stage,
    interviewStatus,
    dateFrom,
    dateTo,
  } = parsed;
  const { organizationId, departmentIds, managerId } = context;

  if (!departmentIds.length) {
    return { data: [], total: 0, page, pageSize };
  }

  const jobIds = await getJobIdsForDepartments(supabase, organizationId, departmentIds);
  if (!jobIds.length) {
    return { data: [], total: 0, page, pageSize };
  }

  const scopedJobIds = jobOpeningId ? jobIds.filter((id) => id === jobOpeningId) : jobIds;
  if (!scopedJobIds.length) {
    return { data: [], total: 0, page, pageSize };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = fromHrms(supabase, "recruitment_candidates")
    .select(
      `id, first_name, last_name, email, experience_years, source, stage, job_opening_id, created_at,
      job:job_opening_id!inner(title, department_id,
        departments:department_id(name),
        hiring_manager:hiring_manager_id(first_name, last_name))`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .in("job_opening_id", scopedJobIds)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (departmentId && departmentIds.includes(departmentId)) {
    query = query.eq("job.department_id", departmentId);
  }
  if (stage) query = query.eq("stage", stage);
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`,
    );
  }

  if (employeeId) {
    const candidateIds = await getRecruitmentCandidateIdsForEmployee(
      supabase,
      organizationId,
      scopedJobIds,
      employeeId,
    );
    if (!candidateIds.length) {
      return { data: [], total: 0, page, pageSize };
    }
    query = query.in("id", candidateIds);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const candidateIds = ((data ?? []) as PerfRow[]).map((row) => row.id as string);
  const latestInterviewByCandidate = new Map<string, PerfRow>();

  if (candidateIds.length) {
    const { data: interviews, error: interviewError } = await fromHrms(
      supabase,
      "recruitment_interviews",
    )
      .select(
        "id, candidate_id, interview_date, interview_status, interviewer_employee_id, created_at",
      )
      .eq("organization_id", organizationId)
      .in("candidate_id", candidateIds)
      .is("deleted_at", null)
      .order("interview_date", { ascending: false });

    if (interviewError) throw new Error(interviewError.message);

    for (const interview of (interviews ?? []) as PerfRow[]) {
      if (!latestInterviewByCandidate.has(interview.candidate_id)) {
        latestInterviewByCandidate.set(interview.candidate_id, interview);
      }
    }
  }

  let rows = ((data ?? []) as PerfRow[]).map((row) => ({
    ...row,
    latest_interview: latestInterviewByCandidate.get(row.id) ?? null,
  }));

  if (interviewStatus) {
    rows = rows.filter(
      (row) => unwrapRelation(row.latest_interview)?.interview_status === interviewStatus,
    );
  }
  if (dateFrom) {
    rows = rows.filter((row) => {
      const date = unwrapRelation(row.latest_interview)?.interview_date;
      return date && date >= dateFrom;
    });
  }
  if (dateTo) {
    rows = rows.filter((row) => {
      const date = unwrapRelation(row.latest_interview)?.interview_date;
      return date && date <= dateTo;
    });
  }

  return {
    data: rows.map((row) => mapCandidateRow(row, managerId)),
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getTeamRecruitmentAnalytics(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
): Promise<TeamRecruitmentAnalytics> {
  const { organizationId, departmentIds, managerId } = context;

  const empty: TeamRecruitmentAnalytics = {
    candidatesByStage: [],
    interviewSuccessRate: 0,
    averageTimeToHireDays: 0,
    departmentHiringProgress: [],
    managerInterviewCompletionRate: 0,
  };

  if (!departmentIds.length) return empty;

  const jobIds = await getJobIdsForDepartments(supabase, organizationId, departmentIds);
  if (!jobIds.length) return empty;

  const stageOrder: CandidateStage[] = [
    "applied",
    "screening",
    "technical",
    "hr",
    "ceo",
    "offer",
    "joined",
    "rejected",
  ];

  const [candidatesRes, interviewsRes, jobsRes, departmentsRes] = await Promise.all([
    fromHrms(supabase, "recruitment_candidates")
      .select("id, stage, created_at, joined_at, job_opening_id")
      .eq("organization_id", organizationId)
      .in("job_opening_id", jobIds)
      .is("deleted_at", null)
      .is("archived_at", null),
    fromHrms(supabase, "recruitment_interviews")
      .select("id, interview_status, recommendation, interviewer_employee_id")
      .eq("organization_id", organizationId)
      .in("job_opening_id", jobIds)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_job_openings")
      .select("id, department_id, open_positions, job_status")
      .eq("organization_id", organizationId)
      .in("department_id", departmentIds)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .in("id", departmentIds)
      .is("deleted_at", null),
  ]);

  if (candidatesRes.error) throw new Error(candidatesRes.error.message);
  if (interviewsRes.error) throw new Error(interviewsRes.error.message);
  if (jobsRes.error) throw new Error(jobsRes.error.message);
  if (departmentsRes.error) throw new Error(departmentsRes.error.message);

  const candidateRows = (candidatesRes.data ?? []) as PerfRow[];
  const interviewRows = (interviewsRes.data ?? []) as PerfRow[];
  const jobRows = (jobsRes.data ?? []) as PerfRow[];
  const departmentMap = new Map(
    (departmentsRes.data ?? []).map((dept) => [dept.id, dept.name as string]),
  );

  const candidatesByStage = stageOrder.map((stage) => ({
    stage,
    count: candidateRows.filter((candidate) => candidate.stage === stage).length,
  }));

  const completedInterviews = interviewRows.filter(
    (interview) => interview.interview_status === "completed",
  );
  const positiveOutcomes = completedInterviews.filter(
    (interview) => interview.recommendation !== "reject",
  );
  const interviewSuccessRate =
    completedInterviews.length > 0
      ? Math.round((positiveOutcomes.length / completedInterviews.length) * 100)
      : 0;

  const joined = candidateRows.filter(
    (candidate) => candidate.stage === "joined" && candidate.joined_at && candidate.created_at,
  );
  const averageTimeToHireDays =
    joined.length > 0
      ? Math.round(
          joined.reduce((sum, candidate) => {
            const start = new Date(candidate.created_at).getTime();
            const end = new Date(candidate.joined_at).getTime();
            return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
          }, 0) / joined.length,
        )
      : 0;

  const filledByDept = new Map<string, number>();
  for (const candidate of candidateRows.filter((row) => row.stage === "joined")) {
    const job = jobRows.find((row) => row.id === candidate.job_opening_id);
    if (!job?.department_id) continue;
    filledByDept.set(job.department_id, (filledByDept.get(job.department_id) ?? 0) + 1);
  }

  const openByDept = new Map<string, number>();
  for (const job of jobRows.filter((row) => row.job_status === "open")) {
    if (!job.department_id) continue;
    openByDept.set(
      job.department_id,
      (openByDept.get(job.department_id) ?? 0) + Number(job.open_positions ?? 0),
    );
  }

  const departmentHiringProgress = departmentIds.map((departmentId) => ({
    departmentId,
    departmentName: departmentMap.get(departmentId) ?? "Department",
    openPositions: openByDept.get(departmentId) ?? 0,
    filledCount: filledByDept.get(departmentId) ?? 0,
  }));

  const managerInterviews = interviewRows.filter(
    (interview) => interview.interviewer_employee_id === managerId,
  );
  const managerCompleted = managerInterviews.filter(
    (interview) => interview.interview_status === "completed",
  );
  const managerInterviewCompletionRate =
    managerInterviews.length > 0
      ? Math.round((managerCompleted.length / managerInterviews.length) * 100)
      : 0;

  return {
    candidatesByStage,
    interviewSuccessRate,
    averageTimeToHireDays,
    departmentHiringProgress,
    managerInterviewCompletionRate,
  };
}

async function getRecruitmentCandidateIdsForEmployee(
  supabase: AuthSupabaseClient,
  organizationId: string,
  scopedJobIds: string[],
  employeeId: string,
) {
  const candidateIds = new Set<string>();

  const hiringManagerJobIds = scopedJobIds.length
    ? (
        await fromHrms(supabase, "recruitment_job_openings")
          .select("id")
          .eq("organization_id", organizationId)
          .in("id", scopedJobIds)
          .eq("hiring_manager_id", employeeId)
          .is("deleted_at", null)
      ).data ?? []
    : [];

  const jobIds = (hiringManagerJobIds as PerfRow[]).map((row) => row.id as string);
  if (jobIds.length) {
    const { data: candidates } = await fromHrms(supabase, "recruitment_candidates")
      .select("id")
      .eq("organization_id", organizationId)
      .in("job_opening_id", jobIds)
      .is("deleted_at", null)
      .is("archived_at", null);

    for (const candidate of (candidates ?? []) as PerfRow[]) {
      candidateIds.add(candidate.id as string);
    }
  }

  const { data: interviews } = await fromHrms(supabase, "recruitment_interviews")
    .select("candidate_id")
    .eq("organization_id", organizationId)
    .eq("interviewer_employee_id", employeeId)
    .is("deleted_at", null);

  for (const interview of (interviews ?? []) as PerfRow[]) {
    candidateIds.add(interview.candidate_id as string);
  }

  return [...candidateIds];
}

export async function getTeamRecruitmentFilterLookups(
  supabase: AuthSupabaseClient,
  context: ManagerRecruitmentContext,
  profile: UserProfile,
): Promise<TeamRecruitmentLookups> {
  const { organizationId, departmentIds, managerId } = context;

  if (!departmentIds.length) {
    return {
      departments: [],
      employees: [],
      jobs: [],
      stages: Object.entries(CANDIDATE_STAGE_LABELS).map(([id, label]) => ({ id, label })),
      interviewStatuses: Object.entries(INTERVIEW_STATUS_LABELS).map(([id, label]) => ({
        id,
        label,
      })),
      panelMembers: [],
    };
  }

  const { teamIds } = await getManagerTeamScope(supabase, profile);

  const [departmentsRes, jobsRes, panelRes, employeesRes] = await Promise.all([
    supabase
      .schema("hrms")
      .from("departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .in("id", departmentIds)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "recruitment_job_openings")
      .select("id, title, job_code, job_status")
      .eq("organization_id", organizationId)
      .in("department_id", departmentIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .schema("hrms")
      .from("employees")
      .select("id, first_name, last_name, employee_code")
      .eq("organization_id", organizationId)
      .in("department_id", departmentIds)
      .in("employment_status", ["active", "probation"])
      .is("deleted_at", null)
      .order("first_name"),
    teamIds.length
      ? supabase
          .schema("hrms")
          .from("employees")
          .select("id, first_name, last_name, employee_code")
          .eq("organization_id", organizationId)
          .in("id", teamIds)
          .is("deleted_at", null)
          .order("first_name")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (departmentsRes.error) throw new Error(departmentsRes.error.message);
  if (jobsRes.error) throw new Error(jobsRes.error.message);
  if (panelRes.error) throw new Error(panelRes.error.message);
  if (employeesRes.error) throw new Error(employeesRes.error.message);

  const panelMembers = (panelRes.data ?? []).map((employee) => ({
    id: employee.id,
    label: `${formatEmployeeName(employee.first_name, employee.last_name)} (${employee.employee_code})`,
  }));

  if (!panelMembers.some((member) => member.id === managerId)) {
    const { data: managerRow } = await supabase
      .schema("hrms")
      .from("employees")
      .select("id, first_name, last_name, employee_code")
      .eq("id", managerId)
      .maybeSingle();
    if (managerRow) {
      panelMembers.unshift({
        id: managerRow.id,
        label: `${formatEmployeeName(managerRow.first_name, managerRow.last_name)} (${managerRow.employee_code})`,
      });
    }
  }

  return {
    departments: (departmentsRes.data ?? []).map((dept) => ({
      id: dept.id,
      label: dept.name,
    })),
    employees: (employeesRes.data ?? []).map((employee) => ({
      id: employee.id,
      label: formatEmployeeName(employee.first_name, employee.last_name),
    })),
    jobs: ((jobsRes.data ?? []) as PerfRow[]).map((job) => ({
      id: job.id,
      label: job.job_code ? `${job.job_code} — ${job.title}` : job.title,
      status: job.job_status,
    })),
    stages: Object.entries(CANDIDATE_STAGE_LABELS).map(([id, label]) => ({ id, label })),
    interviewStatuses: Object.entries(INTERVIEW_STATUS_LABELS).map(([id, label]) => ({
      id,
      label,
    })),
    panelMembers,
  };
}

export async function getManagerTeamRecruitmentPageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
  params: TeamRecruitmentListParams,
): Promise<ManagerTeamRecruitmentPageData> {
  const parsed = teamRecruitmentListParamsSchema.parse(params);

  const [summary, jobs, candidates, analytics, lookups] = await Promise.all([
    getTeamRecruitmentSummary(supabase, profile, context),
    listTeamRecruitmentJobs(supabase, profile, context, parsed),
    listTeamRecruitmentCandidates(supabase, profile, context, parsed),
    getTeamRecruitmentAnalytics(supabase, profile, context),
    getTeamRecruitmentFilterLookups(supabase, context, profile),
  ]);

  return { summary, jobs, candidates, analytics, lookups, context };
}

export async function loadManagerRecruitmentContext(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
) {
  return getManagerRecruitmentContext(supabase, profile);
}
