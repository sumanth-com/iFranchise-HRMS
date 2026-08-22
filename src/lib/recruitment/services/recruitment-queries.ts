import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types/auth";
import type {
  AnalyticsSummary,
  CandidateDetail,
  CandidateListItem,
  CandidateListResult,
  CandidateStage,
  InterviewListItem,
  InterviewListResult,
  InterviewTrackItem,
  InterviewTrackRound,
  JobOpeningItem,
  JobOpeningListResult,
  OfferListItem,
  OfferListResult,
  OfferStatus,
  OpenJobSnapshot,
  RecruitmentLookups,
  RecruitmentOverview,
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
  sortInterviewsForDisplay,
  unwrapRelation,
} from "@/lib/recruitment/services/recruitment-utils";
import {
  getRecruitmentSettings,
  archiveRejectedCandidates,
  nextRecruitmentCode,
} from "@/lib/recruitment/services/recruitment-settings";
import {
  emptyPagedResult,
  resolveManagerDepartmentIds,
} from "@/lib/manager/portal-scope";

export async function getRecruitmentLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
  departmentIds?: string[] | null,
): Promise<RecruitmentLookups> {
  const [departments, designations, employmentTypes, branches, employees, jobs, settings, docTemplates] =
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
        .select("id, title, job_code, job_status, department_id")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      getRecruitmentSettings(supabase, organizationId),
      fromHrms(supabase, "document_templates")
        .select("id, name, subject, body_html")
        .eq("organization_id", organizationId)
        .eq("letter_type", "offer_letter")
        .is("deleted_at", null)
        .order("name"),
    ]);

  let departmentRows = departments.data ?? [];
  let jobRows = (jobs.data ?? []) as PerfRow[];
  if (departmentIds) {
    if (departmentIds.length === 0) {
      departmentRows = [];
      jobRows = [];
    } else {
      departmentRows = departmentRows.filter((row) => departmentIds.includes(row.id));
      jobRows = jobRows.filter(
        (row) => row.department_id && departmentIds.includes(row.department_id),
      );
    }
  }

  return {
    departments: departmentRows.map((d) => ({ id: d.id, label: d.name })),
    designations: (designations.data ?? []).map((d) => ({ id: d.id, label: d.title })),
    employmentTypes: (employmentTypes.data ?? []).map((d) => ({ id: d.id, label: d.name })),
    branches: (branches.data ?? []).map((d) => ({ id: d.id, label: d.name })),
    employees: (employees.data ?? []).map((e) => ({
      id: e.id,
      label: `${formatEmployeeName(e.first_name, e.last_name)} (${e.employee_code})`,
    })),
    jobs: jobRows.map((j) => ({
      id: j.id,
      label: j.job_code ? `${j.job_code} — ${j.title}` : j.title,
      status: j.job_status,
    })),
    sources: settings.candidateSources.filter((s) => s.enabled).map((s) => s.label),
    noticePeriodOptions: settings.noticePeriodOptions,
    defaultHiringManagerId: settings.defaultHiringManagerId,
    defaultInterviewDurationMinutes: settings.defaultInterviewDurationMinutes,
    offerEmailDefaults: settings.offerEmailDefaults,
    offerTemplates: settings.offerTemplates,
    emailTemplates: settings.emailTemplates,
    offerLetterDocumentTemplates: ((docTemplates.data ?? []) as PerfRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      subject: row.subject ?? "Offer Letter",
      bodyHtml: row.body_html ?? "",
    })),
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function buildRecruitmentOverview(createdAts: string[], now: Date): RecruitmentOverview {
  const hours: RecruitmentOverview["hours"] = [];
  const week: RecruitmentOverview["week"] = [];
  const month: RecruitmentOverview["month"] = [];

  const hourCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();

  for (const raw of createdAts) {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) continue;
    const hourKey = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}`;
    const dayKey = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    hourCounts.set(hourKey, (hourCounts.get(hourKey) ?? 0) + 1);
    dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
  }

  for (let i = 23; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setHours(now.getHours() - i, 0, 0, 0);
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}`;
    hours.push({
      key,
      label: date.toLocaleTimeString("en-IN", { hour: "numeric", hour12: true }),
      value: hourCounts.get(key) ?? 0,
    });
  }

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    week.push({
      key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      value: dayCounts.get(key) ?? 0,
    });
  }

  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    month.push({
      key,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: dayCounts.get(key) ?? 0,
    });
  }

  let lastWeek = 0;
  for (let i = 13; i >= 7; i -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    lastWeek += dayCounts.get(key) ?? 0;
  }

  let lastHours = 0;
  for (let i = 47; i >= 24; i -= 1) {
    const date = new Date(now);
    date.setHours(now.getHours() - i, 0, 0, 0);
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}`;
    lastHours += hourCounts.get(key) ?? 0;
  }

  const thisMonthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${pad(lastMonthDate.getMonth() + 1)}`;

  let thisMonth = 0;
  let lastMonth = 0;
  for (const raw of createdAts) {
    const key = String(raw).slice(0, 7);
    if (key === thisMonthKey) thisMonth += 1;
    if (key === lastMonthKey) lastMonth += 1;
  }

  const thisWeek = week.reduce((sum, point) => sum + point.value, 0);
  const thisHours = hours.reduce((sum, point) => sum + point.value, 0);

  return {
    hours,
    week,
    month,
    thisMonth,
    lastMonth,
    thisWeek,
    lastWeek,
    thisHours,
    lastHours,
    maxThisMonth: Math.max(0, ...month.map((point) => point.value)),
    updatedAt: now.toISOString(),
  };
}

export async function getRecruitmentSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<RecruitmentSummary> {
  const organizationId = profile.employee.organizationId;
  const departmentIds = await resolveManagerDepartmentIds(supabase, profile);
  // Apply auto-archive before summary/list metrics
  await archiveRejectedCandidates(supabase, organizationId).catch(() => 0);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const [jobs, candidates, interviews, offers, timeline] = await Promise.all([
    fromHrms(supabase, "recruitment_job_openings")
      .select("id, job_status, open_positions, title, department_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_candidates")
      .select("id, stage, joined_at, created_at, source, job_opening_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_interviews")
      .select(
        `id, candidate_id, job_opening_id, interviewer_employee_id, interview_date, interview_time, interview_status, round_name, meeting_link, interview_type,
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
      .select("id, offer_status, created_at, responded_at, candidate_id, job_opening_id")
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

  let jobRows = (jobs.data ?? []) as PerfRow[];
  let candidateRows = (candidates.data ?? []) as PerfRow[];
  let interviewRows = (interviews.data ?? []) as PerfRow[];
  let offerRows = (offers.data ?? []) as PerfRow[];
  if (departmentIds) {
    if (departmentIds.length === 0) {
      jobRows = [];
      candidateRows = [];
      interviewRows = [];
      offerRows = [];
    } else {
      jobRows = jobRows.filter(
        (row) => row.department_id && departmentIds.includes(row.department_id),
      );
      const allowedJobIds = new Set(jobRows.map((row) => row.id));
      candidateRows = candidateRows.filter((row) => allowedJobIds.has(row.job_opening_id));
      interviewRows = interviewRows.filter((row) => allowedJobIds.has(row.job_opening_id));
      const allowedCandidateIds = new Set(candidateRows.map((row) => row.id));
      offerRows = offerRows.filter((row) => allowedCandidateIds.has(row.candidate_id));
    }
  }

  const openJobs = jobRows.filter((j) => j.job_status === "open");
  const openPositions = openJobs.length;

  const offerSentCandidateIds = new Set(
    offerRows
      .filter((o) => ["sent", "accepted"].includes(o.offer_status))
      .map((o) => String(o.candidate_id)),
  );

  const activeCandidates = candidateRows.filter(
    (c) => !["joined", "rejected"].includes(c.stage) && !offerSentCandidateIds.has(String(c.id)),
  ).length;
  const interviewsToday = interviewRows.filter(
    (i) => i.interview_date === today && i.interview_status === "scheduled",
  ).length;
  const offersAccepted = offerRows.filter((o) => o.offer_status === "accepted").length;
  const hiresThisMonth = candidateRows.filter(
    (c) => c.stage === "joined" && c.joined_at && String(c.joined_at).slice(0, 10) >= monthStartStr,
  ).length;

  const pendingOfferCount = candidateRows.filter(
    (c) => c.stage === "offer" && !offerSentCandidateIds.has(String(c.id)),
  ).length;
  const offersPending = pendingOfferCount;

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
    if (departmentIds && (departmentIds.length === 0 || !departmentIds.includes(id))) {
      continue;
    }
    const name = dept?.name ?? "Unassigned";
    const existing = deptMap.get(id) ?? { departmentId: id, departmentName: name, count: 0 };
    existing.count += 1;
    deptMap.set(id, existing);
  }

  const upcomingInterviews: InterviewListItem[] = interviewRows.map(mapInterviewRow);

  const candidateIds = [
    ...new Set(
      upcomingInterviews
        .map((i) => i.candidateId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  let interviewTracks: InterviewTrackItem[] = [];

  if (candidateIds.length > 0) {
    const trackInterviewsRes = await fromHrms(supabase, "recruitment_interviews")
      .select(
        `id, candidate_id, job_opening_id, interviewer_employee_id, interview_date, interview_time, interview_status, round_name, meeting_link, interview_type,
        candidate:candidate_id(first_name, last_name),
        job:job_opening_id(title),
        interviewer:interviewer_employee_id(first_name, last_name)`,
      )
      .eq("organization_id", organizationId)
      .in("candidate_id", candidateIds)
      .is("deleted_at", null)
      .neq("interview_status", "cancelled")
      .order("interview_date", { ascending: true });

    const byCandidate = new Map<string, InterviewListItem[]>();
    for (const row of (trackInterviewsRes.data ?? []) as PerfRow[]) {
      const item = mapInterviewRow(row);
      const list = byCandidate.get(item.candidateId) ?? [];
      list.push(item);
      byCandidate.set(item.candidateId, list);
    }

    interviewTracks = candidateIds.map((candidateId) => {
      const items = byCandidate.get(candidateId) ?? [];
      const roundMap = new Map<string, InterviewTrackRound>();
      for (const item of items) {
        roundMap.set(item.roundName, {
          roundName: item.roundName,
          interviewStatus: item.interviewStatus,
          interviewDate: item.interviewDate,
          interviewTime: item.interviewTime,
        });
      }
      const rounds = Array.from(roundMap.values());
      const nextScheduled = items.find((i) => i.interviewStatus === "scheduled");
      const anchor = nextScheduled ?? items[items.length - 1];

      return {
        candidateId,
        candidateName: anchor?.candidateName ?? "—",
        jobTitle: anchor?.jobTitle ?? "—",
        interviewerName: anchor?.interviewerName ?? "—",
        interviewType: anchor?.interviewType ?? "offline",
        nextDate: anchor?.interviewDate ?? today,
        nextTime: anchor?.interviewTime ?? "",
        rounds,
      };
    });
  }

  const activeCandidateCountByJob = new Map<string, number>();
  for (const row of candidateRows) {
    if (!row.job_opening_id || ["joined", "rejected"].includes(row.stage)) continue;
    const jobId = String(row.job_opening_id);
    activeCandidateCountByJob.set(jobId, (activeCandidateCountByJob.get(jobId) ?? 0) + 1);
  }

  const openJobSnapshots: OpenJobSnapshot[] = openJobs
    .slice(0, 5)
    .map((job) => ({
      id: job.id,
      title: String(job.title ?? "Untitled role"),
      openPositions: Number(job.open_positions ?? 0),
      candidateCount: activeCandidateCountByJob.get(job.id) ?? 0,
    }));

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
    pendingOfferCount,
    candidatesByStage,
    candidateSources,
    hiringByDepartment: Array.from(deptMap.values()),
    upcomingInterviews,
    recentActivity,
    openJobSnapshots,
    interviewTracks,
    overview: buildRecruitmentOverview(
      candidateRows.map((row) => String(row.created_at ?? "")),
      new Date(),
    ),
  };
}

export async function getHiringAnalytics(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  options?: { month?: number; year?: number },
): Promise<AnalyticsSummary> {
  const organizationId = profile.employee.organizationId;
  const now = new Date();
  const month = options?.month ?? now.getMonth() + 1;
  const year = options?.year ?? now.getFullYear();
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  const [candidates, offers, openJobsRes] = await Promise.all([
    fromHrms(supabase, "recruitment_candidates")
      .select("id, stage, joined_at, created_at, rejected_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_offers")
      .select("id, offer_status, sent_at, responded_at, created_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "recruitment_job_openings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("job_status", "open")
      .is("deleted_at", null),
  ]);

  const candidateRows = (candidates.data ?? []) as PerfRow[];
  const offerRows = (offers.data ?? []) as PerfRow[];

  const cohort = candidateRows.filter((c) => String(c.created_at).slice(0, 7) === monthKey);
  const totalApplications = cohort.length;
  const selectedHired = candidateRows.filter(
    (c) => c.stage === "joined" && c.joined_at && String(c.joined_at).slice(0, 7) === monthKey,
  ).length;
  const rejected = candidateRows.filter((c) => {
    if (c.stage !== "rejected") return false;
    const date = c.rejected_at ?? c.created_at;
    return String(date).slice(0, 7) === monthKey;
  }).length;
  const activeInPipeline = cohort.filter((c) => !["joined", "rejected"].includes(c.stage)).length;
  const atOfferStage = cohort.filter((c) => c.stage === "offer" || c.stage === "ceo").length;

  const hiringRate =
    totalApplications > 0 ? Math.round((selectedHired / totalApplications) * 100) : 0;
  const decided = selectedHired + rejected;
  const selectionRate = decided > 0 ? Math.round((selectedHired / decided) * 100) : 0;

  const offersSent = offerRows.filter((o) => {
    const sentAt = o.sent_at ?? o.created_at;
    return (
      sentAt &&
      String(sentAt).slice(0, 7) === monthKey &&
      ["sent", "accepted", "rejected", "expired"].includes(o.offer_status)
    );
  }).length;
  const offersAccepted = offerRows.filter(
    (o) =>
      o.offer_status === "accepted" &&
      o.responded_at &&
      String(o.responded_at).slice(0, 7) === monthKey,
  ).length;
  const decidedOffers = offerRows.filter((o) => {
    const respondedAt = o.responded_at ?? o.sent_at ?? o.created_at;
    return (
      respondedAt &&
      String(respondedAt).slice(0, 7) === monthKey &&
      ["accepted", "rejected", "expired"].includes(o.offer_status)
    );
  });
  const offerAcceptanceRate =
    decidedOffers.length > 0 ? Math.round((offersAccepted / decidedOffers.length) * 100) : 0;

  const applicationsThisMonth = totalApplications;
  const hiresThisMonth = selectedHired;
  const rejectedThisMonth = rejected;

  const joinedInPeriod = candidateRows.filter(
    (c) => c.stage === "joined" && c.joined_at && c.created_at && String(c.joined_at).slice(0, 7) === monthKey,
  );
  const averageTimeToHireDays =
    joinedInPeriod.length > 0
      ? Math.round(
          joinedInPeriod.reduce((sum, c) => {
            const start = new Date(c.created_at).getTime();
            const end = new Date(c.joined_at).getTime();
            return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
          }, 0) / joinedInPeriod.length,
        )
      : 0;

  const monthlyOutcomes = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    const applications = candidateRows.filter((c) => String(c.created_at).slice(0, 7) === key).length;
    const hired = candidateRows.filter(
      (c) => c.stage === "joined" && c.joined_at && String(c.joined_at).slice(0, 7) === key,
    ).length;
    const rejectedInMonth = candidateRows.filter((c) => {
      if (c.stage !== "rejected") return false;
      const date = c.rejected_at ?? c.created_at;
      return String(date).slice(0, 7) === key;
    }).length;
    return { month: label, applications, hired, rejected: rejectedInMonth };
  });

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
  const pipeline = stageOrder.map((stage) => ({
    stage,
    count: cohort.filter((c) => c.stage === stage).length,
  }));

  return {
    totalApplications,
    selectedHired,
    rejected,
    activeInPipeline,
    atOfferStage,
    hiringRate,
    selectionRate,
    averageTimeToHireDays,
    offersSent,
    offersAccepted,
    offerAcceptanceRate,
    openJobCount: openJobsRes.count ?? 0,
    hiresThisMonth,
    applicationsThisMonth,
    rejectedThisMonth,
    monthlyOutcomes,
    pipeline,
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
  const departmentIds = await resolveManagerDepartmentIds(supabase, profile);

  if (departmentIds && departmentIds.length === 0) {
    return emptyPagedResult(page, pageSize);
  }
  if (departmentIds && departmentId && !departmentIds.includes(departmentId)) {
    return emptyPagedResult(page, pageSize);
  }

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
  else if (departmentIds) query = query.in("department_id", departmentIds);
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
    latestOfferStatus: row.latestOfferStatus ?? undefined,
  };
}

function offerQueueCandidateSelect() {
  return `id, first_name, last_name, email, phone, experience_years, skills, current_company,
      current_ctc, expected_ctc, notice_period_days, source, stage, job_opening_id, resume_path,
      photo_path, notes, employee_id, created_at,
      job:job_opening_id!inner(title, department_id, departments:department_id(name))`;
}

function applyOfferQueueCandidateFilters(
  query: ReturnType<typeof fromHrms>,
  options: {
    jobOpeningId?: string;
    departmentId?: string;
    departmentIds?: string[] | null;
    search?: string;
  },
) {
  let next = query;
  if (options.jobOpeningId) next = next.eq("job_opening_id", options.jobOpeningId);
  if (options.departmentId) next = next.eq("job.department_id", options.departmentId);
  else if (options.departmentIds?.length) next = next.in("job.department_id", options.departmentIds);
  if (options.search) {
    next = next.or(
      `first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%`,
    );
  }
  return next;
}

async function loadActiveOnboardingEmails(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("onboarding_cases")
    .select("personal_email")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .not("status", "in", "(cancelled,archived,rejected,completed)");

  if (error) throw new Error(error.message);

  return [
    ...new Set(
      (data ?? [])
        .map((row) => String(row.personal_email ?? "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function splitOnboardingFullName(fullName: string, email: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    const local = email.split("@")[0]?.trim() || "Candidate";
    return { firstName: local, lastName: "—" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "—" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * HR can add people to Employee Onboarding without a recruitment candidate.
 * Offers list is candidate-based, so create offer-stage rows for those emails
 * so they appear (and offer-letter upload keeps working).
 */
async function ensureOfferQueueCandidatesForOnboardingEmails(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  onboardingEmails: string[],
): Promise<void> {
  if (onboardingEmails.length === 0) return;

  const organizationId = profile.employee.organizationId;
  const admin = createAdminClient();

  const { data: existingRows, error: existingError } = await admin
    .schema("hrms")
    .from("recruitment_candidates")
    .select("email")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .in("email", onboardingEmails);

  if (existingError) throw new Error(existingError.message);

  const existingEmails = new Set(
    ((existingRows ?? []) as PerfRow[])
      .map((row) => String(row.email ?? "").trim().toLowerCase())
      .filter(Boolean),
  );
  const missingEmails = onboardingEmails.filter((email) => !existingEmails.has(email));
  if (missingEmails.length === 0) return;

  const { data: cases, error: casesError } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .select("id, full_name, personal_email, department_id, mobile_number, created_at")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .not("status", "in", "(cancelled,archived,rejected,completed)")
    .order("created_at", { ascending: false });

  if (casesError) throw new Error(casesError.message);
  if (!cases?.length) return;

  const missingSet = new Set(missingEmails);
  const orphanCases = (cases as PerfRow[]).filter((row) => {
    const email = String(row.personal_email ?? "").trim().toLowerCase();
    return Boolean(email) && missingSet.has(email);
  });
  if (orphanCases.length === 0) return;

  const { data: jobs, error: jobsError } = await admin
    .schema("hrms")
    .from("recruitment_job_openings")
    .select("id, department_id, job_status, created_at")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (jobsError) throw new Error(jobsError.message);
  if (!jobs?.length) return;

  const openJobs = (jobs as PerfRow[]).filter((job) => job.job_status === "open");
  const jobPool = openJobs.length > 0 ? openJobs : (jobs as PerfRow[]);
  const settings = await getRecruitmentSettings(supabase, organizationId);

  const seenMissing = new Set<string>();
  for (const caseRow of orphanCases) {
    const email = String(caseRow.personal_email ?? "").trim().toLowerCase();
    if (!email || seenMissing.has(email) || existingEmails.has(email)) continue;
    seenMissing.add(email);

    const departmentId = (caseRow.department_id as string | null) ?? null;
    const matchedJob =
      (departmentId
        ? jobPool.find((job) => String(job.department_id ?? "") === departmentId)
        : null) ?? jobPool[0];
    if (!matchedJob) continue;

    const { firstName, lastName } = splitOnboardingFullName(
      String(caseRow.full_name ?? ""),
      email,
    );
    const candidateCode = await nextRecruitmentCode(
      supabase,
      organizationId,
      "recruitment_candidates",
      "candidate_code",
      settings.numberFormats.candidatePrefix,
    );

    const { error: insertError } = await admin.schema("hrms").from("recruitment_candidates").insert({
      organization_id: organizationId,
      candidate_code: candidateCode,
      job_opening_id: matchedJob.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: (caseRow.mobile_number as string | null) ?? null,
      stage: "offer",
      source: "onboarding",
      notes: "Synced from Employee Onboarding for Offers queue",
      created_by: profile.userId,
      updated_by: profile.userId,
    });

    if (insertError) {
      // Concurrent insert or race — leave existing row; list query will pick it up if present.
      if (!/duplicate|unique/i.test(insertError.message)) {
        throw new Error(insertError.message);
      }
    } else {
      existingEmails.add(email);
    }
  }
}

const ONBOARDING_TERMINAL_STATUSES = ["cancelled", "archived", "rejected", "completed"] as const;

async function resolveActiveOnboardingCaseIdForEmail(
  organizationId: string,
  personalEmail: string,
): Promise<string | null> {
  const email = personalEmail.trim().toLowerCase();
  if (!email) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .select("id, status")
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
  return data.id;
}

async function loadOfferQueueCandidateRows(
  supabase: AuthSupabaseClient,
  organizationId: string,
  options: {
    stage?: string;
    emails?: string[];
    onboardingEmails?: string[];
    jobOpeningId?: string;
    departmentId?: string;
    departmentIds?: string[] | null;
    search?: string;
  },
): Promise<PerfRow[]> {
  let query = fromHrms(supabase, "recruitment_candidates")
    .select(offerQueueCandidateSelect())
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .neq("stage", "rejected");

  if (options.onboardingEmails?.length) {
    // Quote emails so PostgREST parses values that contain @ / .
    const emailList = options.onboardingEmails
      .map((email) => `"${email.replace(/"/g, "")}"`)
      .join(",");
    query = query.or(`stage.eq.offer,email.in.(${emailList})`);
  } else if (options.stage) {
    query = query.eq("stage", options.stage);
  } else if (options.emails?.length) {
    query = query.in("email", options.emails);
  }

  query = applyOfferQueueCandidateFilters(query, options);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as PerfRow[];
}


function matchesOfferQueue(
  latestOfferStatus: OfferStatus | null | undefined,
  offerQueue: string | undefined,
): boolean {
  if (!offerQueue || offerQueue === "all") return true;
  if (offerQueue === "pending") {
    return !latestOfferStatus || latestOfferStatus === "draft";
  }
  if (offerQueue === "sent") return latestOfferStatus === "sent";
  if (offerQueue === "accepted") return latestOfferStatus === "accepted";
  return true;
}

export async function listOfferQueueCandidates(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: unknown,
): Promise<CandidateListResult> {
  const parsed = candidateListParamsSchema.parse(params);
  const { page, pageSize, search, departmentId, jobOpeningId, offerQueue } = parsed;
  const organizationId = profile.employee.organizationId;
  void archiveRejectedCandidates(supabase, organizationId).catch(() => 0);
  const departmentIds = await resolveManagerDepartmentIds(supabase, profile);

  if (departmentIds && departmentIds.length === 0) {
    return emptyPagedResult(page, pageSize);
  }
  if (departmentIds && departmentId && !departmentIds.includes(departmentId)) {
    return emptyPagedResult(page, pageSize);
  }

  const filterOptions = {
    jobOpeningId,
    departmentId,
    departmentIds,
    search,
  };

  const onboardingEmails = await loadActiveOnboardingEmails(supabase, organizationId);
  const onboardingEmailSet = new Set(onboardingEmails);
  await ensureOfferQueueCandidatesForOnboardingEmails(supabase, profile, onboardingEmails);

  const candidateRows = await loadOfferQueueCandidateRows(supabase, organizationId, {
    ...filterOptions,
    onboardingEmails,
  });

  const candidateIds = candidateRows.map((row) => row.id);

  const offerMetaByCandidate = new Map<
    string,
    {
      id: string;
      status: OfferStatus;
      path: string | null;
      fileName: string | null;
    }
  >();
  if (candidateIds.length > 0) {
    const { data: offers, error: offersError } = await fromHrms(supabase, "recruitment_offers")
      .select(
        "id, candidate_id, offer_status, offer_letter_path, offer_letter_filename, created_at",
      )
      .in("candidate_id", candidateIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (offersError) throw new Error(offersError.message);

    for (const offer of offers ?? []) {
      const candidateId = String(offer.candidate_id);
      if (!offerMetaByCandidate.has(candidateId)) {
        offerMetaByCandidate.set(candidateId, {
          id: String(offer.id),
          status: offer.offer_status as OfferStatus,
          path: (offer.offer_letter_path as string | null) ?? null,
          fileName: (offer.offer_letter_filename as string | null) ?? null,
        });
      }
    }
  }

  const enriched = candidateRows
    .map((row) => {
      const mapped = mapCandidateRow(row);
      const offerMeta = offerMetaByCandidate.get(row.id);
      const emailKey = mapped.email.trim().toLowerCase();
      return {
        ...mapped,
        latestOfferStatus: offerMeta?.status ?? null,
        latestOfferId: offerMeta?.id ?? null,
        latestOfferLetterPath: offerMeta?.path ?? null,
        latestOfferLetterFileName: offerMeta?.fileName ?? null,
        inOnboardingList: onboardingEmailSet.has(emailKey),
      };
    })
    .filter((row) => matchesOfferQueue(row.latestOfferStatus, offerQueue));

  const total = enriched.length;
  const from = (page - 1) * pageSize;
  const pageData = enriched.slice(from, from + pageSize);

  return {
    data: pageData,
    total,
    page,
    pageSize,
  };
}

export async function listCandidates(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: unknown,
): Promise<CandidateListResult> {
  const parsed = candidateListParamsSchema.parse(params);
  const { page, pageSize, search, departmentId, jobOpeningId, stage, source, month, year } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;
  void archiveRejectedCandidates(supabase, organizationId).catch(() => 0);
  const departmentIds = await resolveManagerDepartmentIds(supabase, profile);

  if (departmentIds && departmentIds.length === 0) {
    return emptyPagedResult(page, pageSize);
  }
  if (departmentIds && departmentId && !departmentIds.includes(departmentId)) {
    return emptyPagedResult(page, pageSize);
  }

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
  else if (departmentIds) query = query.in("job.department_id", departmentIds);
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`,
    );
  }
  if (month && year) {
    const monthKey = String(month).padStart(2, "0");
    const lastDay = new Date(year, month, 0).getDate();
    query = query
      .gte("created_at", `${year}-${monthKey}-01T00:00:00+05:30`)
      .lte("created_at", `${year}-${monthKey}-${String(lastDay).padStart(2, "0")}T23:59:59.999+05:30`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PerfRow[];
  const candidateIds = rows.map((row) => row.id);
  const offerStatusByCandidate = new Map<string, OfferStatus>();
  if (candidateIds.length > 0) {
    const { data: offers } = await fromHrms(supabase, "recruitment_offers")
      .select("candidate_id, offer_status, created_at")
      .eq("organization_id", organizationId)
      .in("candidate_id", candidateIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    for (const offer of (offers ?? []) as PerfRow[]) {
      const candidateId = String(offer.candidate_id);
      if (!offerStatusByCandidate.has(candidateId)) {
        offerStatusByCandidate.set(candidateId, offer.offer_status as OfferStatus);
      }
    }
  }

  const mapped = rows
    .map((row) => ({
      ...mapCandidateRow(row),
      latestOfferStatus: offerStatusByCandidate.get(row.id) ?? undefined,
    }))
    .filter((row) => row.latestOfferStatus !== "sent" && row.latestOfferStatus !== "accepted");

  return {
    data: mapped,
    total: mapped.length,
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
      .select("id, event_type, title, description, from_stage, to_stage, created_at")
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
        offer_letter_filename, email_subject, offer_letter_body, offer_status, expires_at, employee_id, notes, created_at,
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
  const offers = ((offersRes.data ?? []) as PerfRow[]).map(mapOfferRow);
  const onboardingCaseId = await resolveActiveOnboardingCaseIdForEmail(organizationId, base.email);
  return {
    ...base,
    latestOfferStatus: offers[0]?.offerStatus ?? base.latestOfferStatus,
    latestOfferId: offers[0]?.id ?? null,
    latestOfferLetterPath: offers[0]?.offerLetterPath ?? null,
    latestOfferLetterFileName: offers[0]?.offerLetterFileName ?? null,
    inOnboardingList: Boolean(onboardingCaseId),
    onboardingCaseId,
    timeline: ((timelineRes.data ?? []) as PerfRow[]).map((row) => ({
      id: row.id,
      eventType: row.event_type,
      title: row.title,
      description: row.description,
      fromStage: row.from_stage ?? null,
      toStage: row.to_stage ?? null,
      createdAt: row.created_at,
    })),
    interviews: sortInterviewsForDisplay(
      ((interviewsRes.data ?? []) as PerfRow[]).map(mapInterviewRow),
    ),
    offers,
  };
}

const OFFER_WORKSPACE_OFFER_SELECT = `
  id, candidate_id, job_opening_id, offer_letter_path, offer_letter_filename,
  offer_status, salary, joining_date, expires_at, employee_id, notes,
  email_subject, offer_letter_body, created_at,
  job:job_opening_id(title)
`;

function mapOfferWorkspaceRow(row: PerfRow): OfferListItem {
  const job = unwrapRelation(row.job);
  return {
    id: String(row.id),
    candidateId: String(row.candidate_id ?? ""),
    candidateName: "—",
    candidateEmail: "",
    jobOpeningId: String(row.job_opening_id ?? ""),
    jobTitle: job?.title ?? "—",
    departmentId: null,
    departmentName: null,
    designationId: null,
    designationTitle: null,
    branchId: null,
    branchName: null,
    employmentTypeId: null,
    employmentTypeName: null,
    reportingManagerId: null,
    reportingManagerName: null,
    salary: Number(row.salary ?? 0),
    joiningDate: String(row.joining_date ?? ""),
    offerLetterPath: (row.offer_letter_path as string | null) ?? null,
    offerLetterFileName: (row.offer_letter_filename as string | null) ?? null,
    offerStatus: row.offer_status as OfferStatus,
    expiresAt: (row.expires_at as string | null) ?? null,
    employeeId: (row.employee_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    emailSubject: (row.email_subject as string | null) ?? null,
    emailMessage: (row.offer_letter_body as string | null) ?? null,
    createdAt: String(row.created_at ?? ""),
  };
}

/** Lightweight candidate load for the Offers workspace (no timeline/interviews). */
export async function getOfferWorkspaceCandidateById(
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

  const [offersRes, onboardingCaseId] = await Promise.all([
    fromHrms(supabase, "recruitment_offers")
      .select(OFFER_WORKSPACE_OFFER_SELECT)
      .eq("candidate_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    resolveActiveOnboardingCaseIdForEmail(
      organizationId,
      String((data as PerfRow).email ?? ""),
    ),
  ]);

  const base = mapCandidateRow(data as PerfRow);
  const offers = ((offersRes.data ?? []) as PerfRow[]).map((row) => {
    const mapped = mapOfferWorkspaceRow(row);
    return {
      ...mapped,
      candidateName: base.fullName,
      candidateEmail: base.email,
    };
  });

  return {
    ...base,
    latestOfferStatus: offers[0]?.offerStatus ?? base.latestOfferStatus,
    latestOfferId: offers[0]?.id ?? null,
    latestOfferLetterPath: offers[0]?.offerLetterPath ?? null,
    latestOfferLetterFileName: offers[0]?.offerLetterFileName ?? null,
    inOnboardingList: Boolean(onboardingCaseId),
    onboardingCaseId,
    timeline: [],
    interviews: [],
    offers,
  };
}

function mapInterviewRow(row: PerfRow): InterviewListItem {
  const candidate = unwrapRelation(row.candidate);
  const job = unwrapRelation(row.job);
  const interviewer = unwrapRelation(row.interviewer);
  return {
    id: row.id,
    candidateId: String(row.candidate_id ?? ""),
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
  const departmentIds = await resolveManagerDepartmentIds(supabase, profile);

  if (departmentIds && departmentIds.length === 0) {
    return emptyPagedResult(page, pageSize);
  }

  let query = fromHrms(supabase, "recruitment_interviews")
    .select(
      `id, candidate_id, job_opening_id, interviewer_employee_id, round_name, interview_date,
      interview_time, meeting_link, interview_type, interview_status, rating, comments,
      recommendation, created_at,
      candidate:candidate_id!inner(first_name, last_name),
      job:job_opening_id!inner(title, department_id),
      interviewer:interviewer_employee_id(first_name, last_name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("interview_date", { ascending: false })
    .range(from, to);

  if (departmentIds) query = query.in("job.department_id", departmentIds);
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
    offerLetterFileName: row.offer_letter_filename ?? null,
    offerStatus: row.offer_status,
    expiresAt: row.expires_at,
    employeeId: row.employee_id,
    notes: row.notes,
    emailSubject: row.email_subject ?? null,
    emailMessage: row.offer_letter_body ?? null,
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
        offer_letter_filename, email_subject, offer_letter_body, offer_status, expires_at, employee_id, notes, created_at,
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
