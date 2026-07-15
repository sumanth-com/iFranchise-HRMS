import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  CEO_APPROVALS_SOURCE,
  CEO_SALARY_REVISION_DELTA_THRESHOLD,
  CEO_SALARY_REVISION_PERCENT_THRESHOLD,
  EXECUTIVE_APPROVAL_TYPE_LABELS,
} from "@/lib/ceo/executive-approvals-constants";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import {
  createNotification,
  getEmployeeUserId,
  notifyEmployee,
} from "@/lib/notifications/services/notification-service";
import type { UserProfile } from "@/types/auth";
import type { ExecutiveApprovalType } from "@/types/ceo-approvals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

type SyncCandidate = {
  sourceModule: string;
  sourceRecordId: string;
  approvalType: ExecutiveApprovalType;
  title: string;
  summary: string;
  businessJustification: string | null;
  financialImpact: number;
  riskAssessment: string | null;
  priority: "low" | "medium" | "high" | "critical";
  departmentId: string | null;
  requestedByEmployeeId: string | null;
  submittedAt: string;
  dueAt: string | null;
  supportingDocuments: { name: string; meta?: string | null }[];
  payload: Record<string, unknown>;
};

function addDays(iso: string, days: number) {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function percentIncrease(oldValue: number, newValue: number) {
  if (oldValue <= 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

async function nextRequestCode(
  supabase: AuthSupabaseClient,
  organizationId: string,
) {
  const year = new Date().getFullYear();
  const prefix = `EAR-${year}-`;
  const { data, error } = await fromHrms(supabase, "executive_approval_requests")
    .select("request_code")
    .eq("organization_id", organizationId)
    .ilike("request_code", `${prefix}%`)
    .order("request_code", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const latest = (data?.[0] as LooseRow | undefined)?.request_code as string | undefined;
  const lastNumber = latest ? Number(latest.replace(prefix, "")) : 0;
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function appendApprovalEvent(
  supabase: AuthSupabaseClient,
  input: {
    organizationId: string;
    requestId: string;
    eventKey: string;
    title: string;
    description?: string | null;
    actorEmployeeId?: string | null;
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
    occurredAt?: string;
  },
) {
  const { error } = await fromHrms(supabase, "executive_approval_events").insert({
    organization_id: input.organizationId,
    request_id: input.requestId,
    event_key: input.eventKey,
    title: input.title,
    description: input.description ?? null,
    actor_employee_id: input.actorEmployeeId ?? null,
    actor_user_id: input.actorUserId ?? null,
    metadata: input.metadata ?? {},
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
}

async function upsertSyncedRequest(
  supabase: AuthSupabaseClient,
  organizationId: string,
  userId: string | null,
  candidate: SyncCandidate,
) {
  const { data: existing, error: existingError } = await fromHrms(
    supabase,
    "executive_approval_requests",
  )
    .select("id, request_status")
    .eq("organization_id", organizationId)
    .eq("source_module", candidate.sourceModule)
    .eq("source_record_id", candidate.sourceRecordId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const status = existing.request_status as string;
    if (["approved", "rejected", "completed"].includes(status)) return existing.id as string;

    const { error } = await fromHrms(supabase, "executive_approval_requests")
      .update({
        title: candidate.title,
        summary: candidate.summary,
        business_justification: candidate.businessJustification,
        financial_impact: candidate.financialImpact,
        risk_assessment: candidate.riskAssessment,
        priority: candidate.priority,
        department_id: candidate.departmentId,
        requested_by_employee_id: candidate.requestedByEmployeeId,
        due_at: candidate.dueAt,
        supporting_documents: candidate.supportingDocuments,
        payload: candidate.payload,
        updated_by: userId,
      })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
    return existing.id as string;
  }

  const requestCode = await nextRequestCode(supabase, organizationId);
  const submittedAt = candidate.submittedAt;
  const reviewedAt = addDays(submittedAt, 1);
  const escalatedAt = addDays(submittedAt, 2);

  const { data, error } = await fromHrms(supabase, "executive_approval_requests")
    .insert({
      organization_id: organizationId,
      request_code: requestCode,
      approval_type: candidate.approvalType,
      title: candidate.title,
      summary: candidate.summary,
      business_justification: candidate.businessJustification,
      financial_impact: candidate.financialImpact,
      risk_assessment: candidate.riskAssessment,
      priority: candidate.priority,
      request_status: "pending_ceo",
      department_id: candidate.departmentId,
      requested_by_employee_id: candidate.requestedByEmployeeId,
      source_module: candidate.sourceModule,
      source_record_id: candidate.sourceRecordId,
      submitted_at: submittedAt,
      reviewed_at: reviewedAt,
      escalated_at: escalatedAt,
      due_at: candidate.dueAt,
      supporting_documents: candidate.supportingDocuments,
      attachments: [],
      payload: candidate.payload,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const requestId = data.id as string;
  await appendApprovalEvent(supabase, {
    organizationId,
    requestId,
    eventKey: "submitted",
    title: "Submitted",
    description: "Request submitted for executive review.",
    actorEmployeeId: candidate.requestedByEmployeeId,
    occurredAt: submittedAt,
  });
  await appendApprovalEvent(supabase, {
    organizationId,
    requestId,
    eventKey: "reviewed",
    title: "Reviewed",
    description: "Reviewed by HR / Manager.",
    occurredAt: reviewedAt,
  });
  await appendApprovalEvent(supabase, {
    organizationId,
    requestId,
    eventKey: "escalated",
    title: "Escalated",
    description: "Escalated to CEO for authorization.",
    occurredAt: escalatedAt,
  });

  return requestId;
}

async function collectDomainCandidates(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<SyncCandidate[]> {
  const candidates: SyncCandidate[] = [];

  const [ceoStageRes, promotionsRes, salaryRes, payrollRes] = await Promise.all([
    fromHrms(supabase, "recruitment_candidates")
      .select(
        `id, first_name, last_name, stage, created_at, expected_ctc, job_opening_id,
         job:job_opening_id(id, title, department_id, employment_type_id, created_by)`,
      )
      .eq("organization_id", organizationId)
      .eq("stage", "ceo")
      .is("deleted_at", null),
    fromHrms(supabase, "performance_promotions")
      .select(
        `id, employee_id, promotion_status, recommended_salary, current_salary, reason, created_at,
         recommended_designation_id,
         employees:employee_id(id, first_name, last_name, department_id),
         recommended_designation:recommended_designation_id(title)`,
      )
      .eq("organization_id", organizationId)
      .in("promotion_status", ["recommended", "pending"])
      .is("deleted_at", null),
    fromHrms(supabase, "salary_revisions")
      .select(
        `id, employee_id, old_gross_salary, new_gross_salary, old_net_salary, new_net_salary,
         revision_status, reason, effective_from, created_at,
         employees:employee_id(id, first_name, last_name, department_id)`,
      )
      .eq("organization_id", organizationId)
      .eq("revision_status", "pending")
      .is("deleted_at", null),
    fromHrms(supabase, "payrolls")
      .select("id, payroll_month, payroll_status, total_net, total_gross, created_at, created_by")
      .eq("organization_id", organizationId)
      .in("payroll_status", ["processed", "processing", "draft"])
      .is("deleted_at", null),
  ]);

  if (ceoStageRes.error) {
    console.error("[ceo-approvals-sync] recruitment query failed:", ceoStageRes.error.message);
  }
  if (promotionsRes.error) {
    console.error("[ceo-approvals-sync] promotions query failed:", promotionsRes.error.message);
  }
  if (salaryRes.error) {
    console.error("[ceo-approvals-sync] salary revisions query failed:", salaryRes.error.message);
  }
  if (payrollRes.error) {
    console.error("[ceo-approvals-sync] payroll query failed:", payrollRes.error.message);
  }

  for (const row of (ceoStageRes.data ?? []) as LooseRow[]) {
    const job = unwrapRelation(row.job);
    const name = formatEmployeeName(row.first_name, row.last_name);
    const title = job?.title ?? "Open role";
    const isStrategic = /director|head|vp|vice|chief|lead|principal|senior/i.test(
      String(title),
    );
    candidates.push({
      sourceModule: CEO_APPROVALS_SOURCE.recruitmentCandidate,
      sourceRecordId: row.id,
      approvalType: isStrategic ? "strategic_recruitment" : "senior_hiring",
      title: `${isStrategic ? "Strategic hiring" : "Senior hiring"} · ${name}`,
      summary: `CEO interview stage for ${title}`,
      businessJustification: `Candidate ${name} reached CEO stage for ${title}.`,
      financialImpact: Number(row.expected_ctc ?? 0),
      riskAssessment: "Hiring decision impacts headcount and compensation budget.",
      priority: isStrategic ? "critical" : "high",
      departmentId: (job?.department_id as string | null) ?? null,
      requestedByEmployeeId: null,
      submittedAt: row.created_at,
      dueAt: addDays(row.created_at, 5),
      supportingDocuments: [{ name: "Candidate profile", meta: "Recruitment ATS" }],
      payload: {
        candidateId: row.id,
        jobOpeningId: row.job_opening_id,
        jobTitle: title,
      },
    });
  }

  for (const row of (promotionsRes.data ?? []) as LooseRow[]) {
    const employee = unwrapRelation(row.employees);
    const designation = unwrapRelation(row.recommended_designation);
    const name = formatEmployeeName(employee?.first_name, employee?.last_name);
    const roleLabel = designation?.title ?? "new role";
    candidates.push({
      sourceModule: CEO_APPROVALS_SOURCE.performancePromotion,
      sourceRecordId: row.id,
      approvalType: "executive_promotion",
      title: `Executive promotion · ${name}`,
      summary: `Recommended for ${roleLabel}`,
      businessJustification: row.reason ?? `Promotion recommendation for ${name}.`,
      financialImpact: Math.max(
        0,
        Number(row.recommended_salary ?? 0) - Number(row.current_salary ?? 0),
      ),
      riskAssessment: "Promotion affects banding, reporting lines, and payroll cost.",
      priority: "high",
      departmentId: (employee?.department_id as string | null) ?? null,
      requestedByEmployeeId: null,
      submittedAt: row.created_at,
      dueAt: addDays(row.created_at, 7),
      supportingDocuments: [{ name: "Promotion recommendation", meta: "Performance" }],
      payload: {
        promotionId: row.id,
        employeeId: row.employee_id,
        recommendedDesignationId: row.recommended_designation_id,
      },
    });
  }

  for (const row of (salaryRes.data ?? []) as LooseRow[]) {
    const oldGross = Number(row.old_gross_salary ?? 0);
    const newGross = Number(row.new_gross_salary ?? 0);
    const delta = newGross - oldGross;
    const pct = percentIncrease(oldGross, newGross);
    if (
      delta < CEO_SALARY_REVISION_DELTA_THRESHOLD &&
      pct < CEO_SALARY_REVISION_PERCENT_THRESHOLD
    ) {
      continue;
    }

    const employee = unwrapRelation(row.employees);
    const name = formatEmployeeName(employee?.first_name, employee?.last_name);
    candidates.push({
      sourceModule: CEO_APPROVALS_SOURCE.salaryRevision,
      sourceRecordId: row.id,
      approvalType: "salary_revision",
      title: `Salary revision · ${name}`,
      summary: `Gross ${oldGross.toLocaleString("en-IN")} → ${newGross.toLocaleString("en-IN")}`,
      businessJustification:
        row.reason ??
        `Salary increase of ${pct.toFixed(1)}% exceeds CEO approval threshold.`,
      financialImpact: delta,
      riskAssessment: "Above-threshold compensation change requires executive approval.",
      priority: pct >= 25 || delta >= 50_000 ? "critical" : "high",
      departmentId: (employee?.department_id as string | null) ?? null,
      requestedByEmployeeId: null,
      submittedAt: row.created_at,
      dueAt: addDays(row.created_at, 7),
      supportingDocuments: [
        { name: "Salary revision proposal", meta: `Effective ${row.effective_from}` },
      ],
      payload: {
        salaryRevisionId: row.id,
        employeeId: row.employee_id,
        oldGross,
        newGross,
        percentIncrease: pct,
      },
    });
  }

  for (const row of (payrollRes.data ?? []) as LooseRow[]) {
    const monthLabel = String(row.payroll_month).slice(0, 7);
    candidates.push({
      sourceModule: CEO_APPROVALS_SOURCE.payroll,
      sourceRecordId: row.id,
      approvalType: "budget_approval",
      title: `Payroll budget · ${monthLabel}`,
      summary: `Status: ${row.payroll_status}`,
      businessJustification: `Monthly payroll run ${monthLabel} requires executive budget authorization.`,
      financialImpact: Number(row.total_net ?? row.total_gross ?? 0),
      riskAssessment: "Payroll approval locks compensation outflow for the period.",
      priority: "high",
      departmentId: null,
      requestedByEmployeeId: null,
      submittedAt: row.created_at,
      dueAt: addDays(row.created_at, 3),
      supportingDocuments: [{ name: "Payroll summary", meta: monthLabel }],
      payload: {
        payrollId: row.id,
        payrollMonth: row.payroll_month,
        payrollStatus: row.payroll_status,
      },
    });
  }

  return candidates;
}

export async function syncExecutiveApprovalsFromDomain(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
) {
  const organizationId = profile.employee.organizationId;
  const candidates = await collectDomainCandidates(supabase, organizationId);

  for (const candidate of candidates) {
    await upsertSyncedRequest(supabase, organizationId, profile.userId, candidate);
  }

  return candidates.length;
}

export async function notifyCeoOfApproval(
  supabase: AuthSupabaseClient,
  input: {
    organizationId: string;
    ceoUserId: string;
    ceoEmployeeId?: string | null;
    title: string;
    approvalType: ExecutiveApprovalType;
    requestCode: string;
    requestId: string;
    templateKey:
      | "executive_approval_new"
      | "executive_approval_reminder"
      | "executive_approval_overdue"
      | "executive_approval_escalated";
    dueDate?: string | null;
    createdBy?: string | null;
  },
) {
  await createNotification(supabase, {
    organizationId: input.organizationId,
    userId: input.ceoUserId,
    employeeId: input.ceoEmployeeId ?? null,
    title: input.title,
    message: `${EXECUTIVE_APPROVAL_TYPE_LABELS[input.approvalType]} · ${input.requestCode}`,
    notificationType: input.templateKey,
    module: "system",
    priority: "high",
    actionUrl: CEO_ROUTES.approvals,
    sourceEventKey: `${input.templateKey}:${input.requestId}`,
    templateKey: input.templateKey,
    templateVariables: {
      title: input.title,
      approvalType: EXECUTIVE_APPROVAL_TYPE_LABELS[input.approvalType],
      requestCode: input.requestCode,
      dueDate: input.dueDate ? input.dueDate.slice(0, 10) : "—",
    },
    createdBy: input.createdBy ?? null,
  });
}

export async function notifyRequesterOfDecision(
  supabase: AuthSupabaseClient,
  input: {
    organizationId: string;
    requesterEmployeeId: string | null;
    title: string;
    requestCode: string;
    requestId: string;
    templateKey:
      | "executive_approval_approved"
      | "executive_approval_rejected"
      | "executive_approval_revision"
      | "executive_approval_clarification";
    reason?: string | null;
    createdBy?: string | null;
  },
) {
  if (!input.requesterEmployeeId) return;

  await notifyEmployee(supabase, {
    organizationId: input.organizationId,
    employeeId: input.requesterEmployeeId,
    title: input.title,
    message: `${input.requestCode}: ${input.reason ?? "CEO decision recorded."}`,
    notificationType: input.templateKey,
    module: "system",
    priority: "high",
    actionUrl: CEO_ROUTES.approvals,
    sourceEventKey: `${input.templateKey}:${input.requestId}`,
    templateKey: input.templateKey,
    templateVariables: {
      title: input.title,
      requestCode: input.requestCode,
      reason: input.reason ?? "",
    },
    createdBy: input.createdBy ?? null,
  });
}

export async function resolveCeoRecipient(
  supabase: AuthSupabaseClient,
  organizationId: string,
  fallbackUserId: string,
  fallbackEmployeeId: string,
) {
  const userId = (await getEmployeeUserId(supabase, fallbackEmployeeId)) ?? fallbackUserId;
  return { userId, employeeId: fallbackEmployeeId, organizationId };
}
