import { format, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  CEO_ACTIONABLE_APPROVAL_STATUSES,
  CEO_PENDING_APPROVAL_STATUSES,
  EXECUTIVE_APPROVAL_PRIORITY_LABELS,
  EXECUTIVE_APPROVAL_STATUS_LABELS,
  EXECUTIVE_APPROVAL_TYPE_LABELS,
  EXECUTIVE_APPROVAL_TYPES,
} from "@/lib/ceo/executive-approvals-constants";
import { syncExecutiveApprovalsFromDomain } from "@/lib/ceo/services/ceo-approvals-sync";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import { ceoApprovalsListParamsSchema } from "@/lib/validations/ceo-approvals";
import type { UserProfile } from "@/types/auth";
import type {
  CeoApprovalsCategoryCount,
  CeoApprovalsDetail,
  CeoApprovalsDocumentItem,
  CeoApprovalsFilterLookups,
  CeoApprovalsInsights,
  CeoApprovalsKpis,
  CeoApprovalsListParams,
  CeoApprovalsPageData,
  CeoApprovalsQueueResult,
  ExecutiveApprovalPriority,
  ExecutiveApprovalStatus,
  ExecutiveApprovalType,
} from "@/types/ceo-approvals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

function parseParams(params: CeoApprovalsListParams) {
  return ceoApprovalsListParamsSchema.parse(params);
}

function parseDocuments(value: unknown): CeoApprovalsDocumentItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as LooseRow;
      if (!row.name) return null;
      return {
        name: String(row.name),
        url: row.url ? String(row.url) : null,
        path: row.path ? String(row.path) : null,
        meta: row.meta ? String(row.meta) : null,
      };
    })
    .filter(Boolean) as CeoApprovalsDocumentItem[];
}

function hoursBetween(from: string | null, to: string | null) {
  if (!from || !to) return null;
  const start = parseISO(from).getTime();
  const end = parseISO(to).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round(((end - start) / (1000 * 60 * 60)) * 10) / 10;
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function applyListFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  params: ReturnType<typeof parseParams>,
) {
  if (params.approvalType) query = query.eq("approval_type", params.approvalType);
  if (params.priority) query = query.eq("priority", params.priority);
  if (params.departmentId) query = query.eq("department_id", params.departmentId);
  if (params.status) query = query.eq("request_status", params.status);
  if (params.requestedById) {
    query = query.eq("requested_by_employee_id", params.requestedById);
  }
  if (params.dateFrom) query = query.gte("submitted_at", params.dateFrom);
  if (params.dateTo) {
    const end = params.dateTo.includes("T")
      ? params.dateTo
      : `${params.dateTo}T23:59:59.999Z`;
    query = query.lte("submitted_at", end);
  }
  if (params.search?.trim()) {
    const term = params.search.trim();
    query = query.or(
      `request_code.ilike.%${term}%,title.ilike.%${term}%,summary.ilike.%${term}%`,
    );
  }
  return query;
}

export async function getCeoApprovalsFilterLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<CeoApprovalsFilterLookups> {
  const [departments, requesters, employees] = await Promise.all([
    fromHrms(supabase, "departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "executive_approval_requests")
      .select(
        "requested_by_employee_id, requester:requested_by_employee_id(id, first_name, last_name)",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .not("requested_by_employee_id", "is", null),
    fromHrms(supabase, "employees")
      .select("id, first_name, last_name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("employment_status", ["active", "probation", "on_leave"])
      .order("first_name")
      .limit(200),
  ]);

  if (departments.error) throw new Error(departments.error.message);
  if (requesters.error) throw new Error(requesters.error.message);
  if (employees.error) throw new Error(employees.error.message);

  const requesterMap = new Map<string, string>();
  for (const row of (requesters.data ?? []) as LooseRow[]) {
    const person = unwrapRelation(row.requester);
    if (!person?.id) continue;
    requesterMap.set(
      person.id,
      formatEmployeeName(person.first_name, person.last_name),
    );
  }

  return {
    departments: ((departments.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    requesters: Array.from(requesterMap.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    forwardTargets: ((employees.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: formatEmployeeName(row.first_name, row.last_name),
    })),
  };
}

export async function getCeoApprovalsKpis(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoApprovalsListParams,
): Promise<CeoApprovalsKpis> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(params);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  let query = fromHrms(supabase, "executive_approval_requests")
    .select(
      "id, priority, request_status, submitted_at, escalated_at, due_at, decided_at",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  query = applyListFilters(query, parsed);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LooseRow[];
  const pending = rows.filter((row) =>
    CEO_PENDING_APPROVAL_STATUSES.includes(row.request_status as ExecutiveApprovalStatus),
  );
  const decidedThisMonth = rows.filter(
    (row) => row.decided_at && row.decided_at >= monthStart,
  );

  const approvalDurations = decidedThisMonth
    .map((row) => hoursBetween(row.submitted_at, row.decided_at))
    .filter((value): value is number => value != null);

  return {
    totalPending: pending.length,
    highPriority: pending.filter((row) =>
      ["high", "critical"].includes(row.priority),
    ).length,
    waitingThisWeek: pending.filter((row) => row.submitted_at >= weekStart).length,
    approvedThisMonth: decidedThisMonth.filter((row) => row.request_status === "approved")
      .length,
    rejectedThisMonth: decidedThisMonth.filter((row) => row.request_status === "rejected")
      .length,
    averageApprovalTimeHours: avg(approvalDurations),
    overdueRequests: pending.filter(
      (row) => row.due_at && row.due_at < now.toISOString(),
    ).length,
    escalatedRequests: pending.filter((row) =>
      ["escalated", "pending_ceo"].includes(row.request_status),
    ).length,
  };
}

export async function getCeoApprovalsCategories(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoApprovalsListParams,
): Promise<CeoApprovalsCategoryCount[]> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(params);

  let query = fromHrms(supabase, "executive_approval_requests")
    .select("approval_type, request_status")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  query = applyListFilters(query, { ...parsed, approvalType: undefined });
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LooseRow[];
  return EXECUTIVE_APPROVAL_TYPES.map((type) => {
    const typed = rows.filter((row) => row.approval_type === type);
    return {
      type,
      label: EXECUTIVE_APPROVAL_TYPE_LABELS[type],
      pending: typed.filter((row) =>
        CEO_PENDING_APPROVAL_STATUSES.includes(
          row.request_status as ExecutiveApprovalStatus,
        ),
      ).length,
      total: typed.length,
    };
  });
}

export async function listCeoApprovalsQueue(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoApprovalsListParams,
): Promise<CeoApprovalsQueueResult> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(params);
  const page = parsed.page ?? 1;
  const pageSize = parsed.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const nowIso = new Date().toISOString();

  let query = fromHrms(supabase, "executive_approval_requests")
    .select(
      `id, request_code, approval_type, title, department_id, requested_by_employee_id,
       submitted_at, priority, request_status, due_at, financial_impact,
       department:department_id(name),
       requester:requested_by_employee_id(first_name, last_name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("submitted_at", { ascending: false })
    .range(from, to);

  query = applyListFilters(query, parsed);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as LooseRow[]).map((row) => {
    const department = unwrapRelation(row.department);
    const requester = unwrapRelation(row.requester);
    const status = row.request_status as ExecutiveApprovalStatus;
    const dueAt = row.due_at as string | null;
    return {
      id: row.id as string,
      requestCode: row.request_code as string,
      approvalType: row.approval_type as ExecutiveApprovalType,
      approvalTypeLabel:
        EXECUTIVE_APPROVAL_TYPE_LABELS[row.approval_type as ExecutiveApprovalType],
      title: row.title as string,
      departmentId: (row.department_id as string | null) ?? null,
      departmentName: (department?.name as string | null) ?? null,
      requestedById: (row.requested_by_employee_id as string | null) ?? null,
      requestedByName: requester
        ? formatEmployeeName(requester.first_name, requester.last_name)
        : null,
      submittedAt: row.submitted_at as string,
      priority: row.priority as ExecutiveApprovalPriority,
      status,
      statusLabel: EXECUTIVE_APPROVAL_STATUS_LABELS[status],
      dueAt,
      isOverdue: Boolean(
        dueAt &&
          dueAt < nowIso &&
          CEO_PENDING_APPROVAL_STATUSES.includes(status),
      ),
      financialImpact: Number(row.financial_impact ?? 0),
    };
  });

  return {
    data: rows,
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getCeoApprovalsInsights(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoApprovalsListParams,
): Promise<CeoApprovalsInsights> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(params);

  let query = fromHrms(supabase, "executive_approval_requests")
    .select(
      `id, priority, request_status, submitted_at, decided_at, department_id,
       department:department_id(name)`,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  query = applyListFilters(query, parsed);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LooseRow[];
  const pending = rows.filter((row) =>
    CEO_PENDING_APPROVAL_STATUSES.includes(row.request_status as ExecutiveApprovalStatus),
  );

  const byDepartment = new Map<string, number>();
  for (const row of pending) {
    const department = unwrapRelation(row.department);
    const label = (department?.name as string | undefined) ?? "Unassigned";
    byDepartment.set(label, (byDepartment.get(label) ?? 0) + 1);
  }

  const byPriority = new Map<string, number>();
  for (const row of pending) {
    const label =
      EXECUTIVE_APPROVAL_PRIORITY_LABELS[row.priority as ExecutiveApprovalPriority] ??
      row.priority;
    byPriority.set(label, (byPriority.get(label) ?? 0) + 1);
  }

  const decided = rows.filter((row) => row.decided_at);
  const turnaroundBuckets = [
    { label: "≤ 24h", max: 24, value: 0 },
    { label: "1–3 days", max: 72, value: 0 },
    { label: "3–7 days", max: 168, value: 0 },
    { label: "> 7 days", max: Infinity, value: 0 },
  ];
  const durations: number[] = [];
  for (const row of decided) {
    const hours = hoursBetween(row.submitted_at, row.decided_at);
    if (hours == null) continue;
    durations.push(hours);
    const bucket = turnaroundBuckets.find((item) => hours <= item.max);
    if (bucket) bucket.value += 1;
  }

  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = subMonths(new Date(), 5 - index);
    const key = format(date, "yyyy-MM");
    return {
      label: format(date, "MMM yyyy"),
      key,
      value: 0,
    };
  });
  for (const row of decided) {
    const key = format(parseISO(row.decided_at), "yyyy-MM");
    const bucket = monthly.find((item) => item.key === key);
    if (bucket) bucket.value += 1;
  }

  const approvedCount = decided.filter((row) => row.request_status === "approved").length;
  const decidedCount = decided.filter((row) =>
    ["approved", "rejected"].includes(row.request_status),
  ).length;
  const successRate =
    decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 1000) / 10 : 0;

  return {
    pendingByDepartment: Array.from(byDepartment.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    pendingByPriority: Array.from(byPriority.entries()).map(([label, value]) => ({
      label,
      value,
    })),
    approvalTurnaroundHours: turnaroundBuckets.map(({ label, value }) => ({
      label,
      value,
    })),
    monthlyApprovalTrend: monthly.map(({ label, value }) => ({ label, value })),
    approvalSuccessRate: successRate,
    averageProcessingTimeHours: avg(durations),
  };
}

export async function getCeoApprovalsDetail(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  requestId: string,
): Promise<CeoApprovalsDetail> {
  const organizationId = profile.employee.organizationId;

  const { data, error } = await fromHrms(supabase, "executive_approval_requests")
    .select(
      `*,
       department:department_id(name),
       requester:requested_by_employee_id(id, first_name, last_name, email),
       reviewer:reviewed_by_employee_id(first_name, last_name),
       escalator:escalated_by_employee_id(first_name, last_name),
       decider:decided_by_employee_id(first_name, last_name),
       forwarded:forwarded_to_employee_id(first_name, last_name)`,
    )
    .eq("id", requestId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Approval request not found.");

  const row = data as LooseRow;
  const [eventsRes, commentsRes, historyRes] = await Promise.all([
    fromHrms(supabase, "executive_approval_events")
      .select(
        `id, event_key, title, description, occurred_at,
         actor:actor_employee_id(first_name, last_name)`,
      )
      .eq("request_id", requestId)
      .order("occurred_at", { ascending: true }),
    fromHrms(supabase, "executive_approval_comments")
      .select(
        `id, comment_text, is_executive_remark, created_at,
         author:author_employee_id(first_name, last_name)`,
      )
      .eq("request_id", requestId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    fromHrms(supabase, "executive_approval_requests")
      .select(
        `id, request_status, decision_reason, decided_at,
         decider:decided_by_employee_id(first_name, last_name)`,
      )
      .eq("organization_id", organizationId)
      .eq("approval_type", row.approval_type)
      .neq("id", requestId)
      .not("decided_at", "is", null)
      .is("deleted_at", null)
      .order("decided_at", { ascending: false })
      .limit(5),
  ]);

  if (eventsRes.error) throw new Error(eventsRes.error.message);
  if (commentsRes.error) throw new Error(commentsRes.error.message);
  if (historyRes.error) throw new Error(historyRes.error.message);

  const department = unwrapRelation(row.department);
  const requester = unwrapRelation(row.requester);
  const reviewer = unwrapRelation(row.reviewer);
  const escalator = unwrapRelation(row.escalator);
  const decider = unwrapRelation(row.decider);
  const forwarded = unwrapRelation(row.forwarded);
  const status = row.request_status as ExecutiveApprovalStatus;
  const approvalType = row.approval_type as ExecutiveApprovalType;

  return {
    id: row.id,
    requestCode: row.request_code,
    approvalType,
    approvalTypeLabel: EXECUTIVE_APPROVAL_TYPE_LABELS[approvalType],
    title: row.title,
    summary: row.summary,
    businessJustification: row.business_justification,
    financialImpact: Number(row.financial_impact ?? 0),
    riskAssessment: row.risk_assessment,
    priority: row.priority,
    status,
    statusLabel: EXECUTIVE_APPROVAL_STATUS_LABELS[status],
    departmentId: row.department_id,
    departmentName: department?.name ?? null,
    requestedById: row.requested_by_employee_id,
    requestedByName: requester
      ? formatEmployeeName(requester.first_name, requester.last_name)
      : null,
    requestedByEmail: requester?.email ?? null,
    reviewedByName: reviewer
      ? formatEmployeeName(reviewer.first_name, reviewer.last_name)
      : null,
    escalatedByName: escalator
      ? formatEmployeeName(escalator.first_name, escalator.last_name)
      : null,
    decidedByName: decider
      ? formatEmployeeName(decider.first_name, decider.last_name)
      : null,
    forwardedToName: forwarded
      ? formatEmployeeName(forwarded.first_name, forwarded.last_name)
      : null,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    escalatedAt: row.escalated_at,
    dueAt: row.due_at,
    decidedAt: row.decided_at,
    completedAt: row.completed_at,
    executiveRemarks: row.executive_remarks,
    decisionReason: row.decision_reason,
    sourceModule: row.source_module,
    sourceRecordId: row.source_record_id,
    supportingDocuments: parseDocuments(row.supporting_documents),
    attachments: parseDocuments(row.attachments),
    timeline: ((eventsRes.data ?? []) as LooseRow[]).map((event) => {
      const actor = unwrapRelation(event.actor);
      return {
        id: event.id,
        eventKey: event.event_key,
        title: event.title,
        description: event.description,
        occurredAt: event.occurred_at,
        actorName: actor
          ? formatEmployeeName(actor.first_name, actor.last_name)
          : null,
      };
    }),
    previousDecisions: ((historyRes.data ?? []) as LooseRow[]).map((item) => {
      const actor = unwrapRelation(item.decider);
      return {
        id: item.id,
        decision:
          EXECUTIVE_APPROVAL_STATUS_LABELS[
            item.request_status as ExecutiveApprovalStatus
          ] ?? item.request_status,
        reason: item.decision_reason,
        decidedAt: item.decided_at,
        actorName: actor
          ? formatEmployeeName(actor.first_name, actor.last_name)
          : null,
      };
    }),
    comments: ((commentsRes.data ?? []) as LooseRow[]).map((comment) => {
      const author = unwrapRelation(comment.author);
      return {
        id: comment.id,
        commentText: comment.comment_text,
        isExecutiveRemark: Boolean(comment.is_executive_remark),
        authorName: author
          ? formatEmployeeName(author.first_name, author.last_name)
          : null,
        createdAt: comment.created_at,
      };
    }),
    canAct: CEO_ACTIONABLE_APPROVAL_STATUSES.includes(status),
  };
}

export async function getCeoApprovalsPageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoApprovalsListParams,
): Promise<CeoApprovalsPageData> {
  await syncExecutiveApprovalsFromDomain(supabase, profile);

  const [kpis, categories, queue, insights, lookups] = await Promise.all([
    getCeoApprovalsKpis(supabase, profile, params),
    getCeoApprovalsCategories(supabase, profile, params),
    listCeoApprovalsQueue(supabase, profile, params),
    getCeoApprovalsInsights(supabase, profile, params),
    getCeoApprovalsFilterLookups(supabase, profile.employee.organizationId),
  ]);

  return { kpis, categories, queue, insights, lookups };
}
