import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import {
  CEO_ACTIONABLE_APPROVAL_STATUSES,
  CEO_APPROVALS_SOURCE,
  EXECUTIVE_APPROVAL_STATUS_LABELS,
} from "@/lib/ceo/executive-approvals-constants";
import {
  appendApprovalEvent,
  notifyRequesterOfDecision,
} from "@/lib/ceo/services/ceo-approvals-sync";
import { approvePayrollStep, rejectPayrollRun } from "@/lib/payroll/services/payroll-mutations";
import { approvePromotionStep } from "@/lib/performance/services/performance-mutations";
import { fromHrms } from "@/lib/reports/services/reports-utils";
import { moveCandidateStage } from "@/lib/recruitment/services/recruitment-mutations";
import {
  createNotification,
  getEmployeeUserId,
  notifyEmployee,
} from "@/lib/notifications/services/notification-service";
import type { UserProfile } from "@/types/auth";
import type { ExecutiveApprovalStatus } from "@/types/ceo-approvals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

async function loadRequest(
  supabase: AuthSupabaseClient,
  organizationId: string,
  requestId: string,
) {
  const { data, error } = await fromHrms(supabase, "executive_approval_requests")
    .select("*")
    .eq("id", requestId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Approval request not found.");
  return data as LooseRow;
}

function assertActionable(status: ExecutiveApprovalStatus) {
  if (!CEO_ACTIONABLE_APPROVAL_STATUSES.includes(status)) {
    throw new Error(
      `This request is ${EXECUTIVE_APPROVAL_STATUS_LABELS[status]} and cannot be decided.`,
    );
  }
}

async function applyDomainDecision(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  request: LooseRow,
  decision: "approved" | "rejected",
  reason?: string,
) {
  const sourceModule = request.source_module as string | null;
  const sourceRecordId = request.source_record_id as string | null;
  if (!sourceModule || !sourceRecordId) return;

  if (sourceModule === CEO_APPROVALS_SOURCE.recruitmentCandidate) {
    await moveCandidateStage(supabase, profile, {
      candidateId: sourceRecordId,
      stage: decision === "approved" ? "offer" : "rejected",
      reason:
        reason ??
        (decision === "approved"
          ? "Approved by CEO"
          : "Rejected by CEO"),
    });
    return;
  }

  if (sourceModule === CEO_APPROVALS_SOURCE.performancePromotion) {
    if (decision === "approved") {
      await approvePromotionStep(supabase, profile, sourceRecordId, reason);
      return;
    }

    const { error } = await fromHrms(supabase, "performance_promotions")
      .update({
        promotion_status: "rejected",
        approver_employee_id: profile.employee.id,
        updated_by: profile.userId,
      })
      .eq("id", sourceRecordId)
      .eq("organization_id", profile.employee.organizationId);

    if (error) throw new Error(error.message);

    await fromHrms(supabase, "performance_promotion_approvals")
      .update({
        approval_status: "rejected",
        comments: reason ?? "Rejected by CEO",
        acted_at: new Date().toISOString(),
        approver_employee_id: profile.employee.id,
        updated_by: profile.userId,
      })
      .eq("promotion_id", sourceRecordId)
      .eq("approval_status", "pending");

    return;
  }

  if (sourceModule === CEO_APPROVALS_SOURCE.salaryRevision) {
    const { error } = await fromHrms(supabase, "salary_revisions")
      .update({
        revision_status: decision === "approved" ? "approved" : "rejected",
        approver_employee_id: profile.employee.id,
        approved_at: decision === "approved" ? new Date().toISOString() : null,
        updated_by: profile.userId,
      })
      .eq("id", sourceRecordId)
      .eq("organization_id", profile.employee.organizationId);

    if (error) throw new Error(error.message);
    return;
  }

  if (sourceModule === CEO_APPROVALS_SOURCE.payroll) {
    if (decision === "approved") {
      await approvePayrollStep(supabase, profile, sourceRecordId, reason);
    } else {
      await rejectPayrollRun(
        supabase,
        profile,
        sourceRecordId,
        reason ?? "Rejected by CEO",
      );
    }
  }
}

async function finalizeRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  request: LooseRow,
  nextStatus: ExecutiveApprovalStatus,
  input: {
    remarks?: string | null;
    reason?: string | null;
    eventKey: string;
    eventTitle: string;
    eventDescription: string;
    notifyTemplate?:
      | "executive_approval_approved"
      | "executive_approval_rejected"
      | "executive_approval_revision"
      | "executive_approval_clarification";
    completed?: boolean;
  },
) {
  const now = new Date().toISOString();
  const organizationId = profile.employee.organizationId;

  const { error } = await fromHrms(supabase, "executive_approval_requests")
    .update({
      request_status: nextStatus,
      decided_by_employee_id: profile.employee.id,
      decided_at: now,
      completed_at: input.completed ? now : null,
      executive_remarks: input.remarks ?? request.executive_remarks ?? null,
      decision_reason: input.reason ?? null,
      updated_by: profile.userId,
    })
    .eq("id", request.id)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  if (input.remarks?.trim()) {
    await fromHrms(supabase, "executive_approval_comments").insert({
      organization_id: organizationId,
      request_id: request.id,
      author_employee_id: profile.employee.id,
      author_user_id: profile.userId,
      comment_text: input.remarks.trim(),
      is_executive_remark: true,
      created_by: profile.userId,
      updated_by: profile.userId,
    });
  }

  await appendApprovalEvent(supabase, {
    organizationId,
    requestId: request.id,
    eventKey: input.eventKey,
    title: input.eventTitle,
    description: input.eventDescription,
    actorEmployeeId: profile.employee.id,
    actorUserId: profile.userId,
    metadata: { status: nextStatus, reason: input.reason ?? null },
  });

  if (input.completed) {
    await appendApprovalEvent(supabase, {
      organizationId,
      requestId: request.id,
      eventKey: "completed",
      title: "Completed",
      description: "Executive approval workflow completed.",
      actorEmployeeId: profile.employee.id,
      actorUserId: profile.userId,
    });
  }

  if (input.notifyTemplate) {
    await notifyRequesterOfDecision(supabase, {
      organizationId,
      requesterEmployeeId: request.requested_by_employee_id,
      title: request.title,
      requestCode: request.request_code,
      requestId: request.id,
      templateKey: input.notifyTemplate,
      reason: input.reason,
      createdBy: profile.userId,
    });
  }
}

export async function approveExecutiveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: { requestId: string; remarks?: string },
) {
  const request = await loadRequest(
    supabase,
    profile.employee.organizationId,
    input.requestId,
  );
  assertActionable(request.request_status as ExecutiveApprovalStatus);

  await applyDomainDecision(supabase, profile, request, "approved", input.remarks);
  await finalizeRequest(supabase, profile, request, "approved", {
    remarks: input.remarks,
    reason: input.remarks ?? "Approved by CEO",
    eventKey: "ceo_decision",
    eventTitle: "CEO Decision",
    eventDescription: "Approved by CEO.",
    notifyTemplate: "executive_approval_approved",
    completed: true,
  });
}

export async function rejectExecutiveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: { requestId: string; reason: string; remarks?: string },
) {
  const request = await loadRequest(
    supabase,
    profile.employee.organizationId,
    input.requestId,
  );
  assertActionable(request.request_status as ExecutiveApprovalStatus);

  await applyDomainDecision(supabase, profile, request, "rejected", input.reason);
  await finalizeRequest(supabase, profile, request, "rejected", {
    remarks: input.remarks,
    reason: input.reason,
    eventKey: "ceo_decision",
    eventTitle: "CEO Decision",
    eventDescription: `Rejected by CEO. ${input.reason}`,
    notifyTemplate: "executive_approval_rejected",
    completed: true,
  });
}

export async function requestClarificationOnExecutiveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: { requestId: string; reason: string; remarks?: string },
) {
  const request = await loadRequest(
    supabase,
    profile.employee.organizationId,
    input.requestId,
  );
  assertActionable(request.request_status as ExecutiveApprovalStatus);

  await finalizeRequest(supabase, profile, request, "clarification_requested", {
    remarks: input.remarks,
    reason: input.reason,
    eventKey: "clarification_requested",
    eventTitle: "Clarification Requested",
    eventDescription: input.reason,
    notifyTemplate: "executive_approval_clarification",
  });
}

export async function sendBackExecutiveRequestForRevision(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: { requestId: string; reason: string; remarks?: string },
) {
  const request = await loadRequest(
    supabase,
    profile.employee.organizationId,
    input.requestId,
  );
  assertActionable(request.request_status as ExecutiveApprovalStatus);

  await finalizeRequest(supabase, profile, request, "revision_requested", {
    remarks: input.remarks,
    reason: input.reason,
    eventKey: "revision_requested",
    eventTitle: "Sent Back for Revision",
    eventDescription: input.reason,
    notifyTemplate: "executive_approval_revision",
  });
}

export async function addExecutiveApprovalComment(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: { requestId: string; comment: string; isExecutiveRemark?: boolean },
) {
  const request = await loadRequest(
    supabase,
    profile.employee.organizationId,
    input.requestId,
  );

  const { error } = await fromHrms(supabase, "executive_approval_comments").insert({
    organization_id: profile.employee.organizationId,
    request_id: request.id,
    author_employee_id: profile.employee.id,
    author_user_id: profile.userId,
    comment_text: input.comment.trim(),
    is_executive_remark: Boolean(input.isExecutiveRemark),
    created_by: profile.userId,
    updated_by: profile.userId,
  });

  if (error) throw new Error(error.message);

  if (input.isExecutiveRemark) {
    await fromHrms(supabase, "executive_approval_requests")
      .update({
        executive_remarks: input.comment.trim(),
        updated_by: profile.userId,
      })
      .eq("id", request.id);
  }

  await appendApprovalEvent(supabase, {
    organizationId: profile.employee.organizationId,
    requestId: request.id,
    eventKey: "comment",
    title: input.isExecutiveRemark ? "Executive Remarks" : "Comment Added",
    description: input.comment.trim(),
    actorEmployeeId: profile.employee.id,
    actorUserId: profile.userId,
  });
}

export async function forwardExecutiveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: { requestId: string; forwardToEmployeeId: string; remarks?: string },
) {
  const request = await loadRequest(
    supabase,
    profile.employee.organizationId,
    input.requestId,
  );
  assertActionable(request.request_status as ExecutiveApprovalStatus);

  const { data: target, error: targetError } = await fromHrms(supabase, "employees")
    .select("id, first_name, last_name")
    .eq("id", input.forwardToEmployeeId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (targetError) throw new Error(targetError.message);
  if (!target) throw new Error("Forward recipient not found.");

  const { error } = await fromHrms(supabase, "executive_approval_requests")
    .update({
      request_status: "forwarded",
      forwarded_to_employee_id: input.forwardToEmployeeId,
      executive_remarks: input.remarks ?? request.executive_remarks ?? null,
      updated_by: profile.userId,
    })
    .eq("id", request.id);

  if (error) throw new Error(error.message);

  await appendApprovalEvent(supabase, {
    organizationId: profile.employee.organizationId,
    requestId: request.id,
    eventKey: "forwarded",
    title: "Forwarded",
    description: input.remarks ?? `Forwarded to ${target.first_name} ${target.last_name}`,
    actorEmployeeId: profile.employee.id,
    actorUserId: profile.userId,
    metadata: { forwardToEmployeeId: input.forwardToEmployeeId },
  });

  const targetUserId = await getEmployeeUserId(supabase, input.forwardToEmployeeId);
  if (targetUserId) {
    await createNotification(supabase, {
      organizationId: profile.employee.organizationId,
      userId: targetUserId,
      employeeId: input.forwardToEmployeeId,
      title: `Forwarded approval: ${request.request_code}`,
      message: request.title,
      notificationType: "executive_approval_forwarded",
      module: "system",
      priority: "high",
      actionUrl: CEO_ROUTES.approvals,
      sourceEventKey: `executive_approval_forwarded:${request.id}`,
      createdBy: profile.userId,
    });
  } else {
    await notifyEmployee(supabase, {
      organizationId: profile.employee.organizationId,
      employeeId: input.forwardToEmployeeId,
      title: `Forwarded approval: ${request.request_code}`,
      message: request.title,
      notificationType: "executive_approval_forwarded",
      module: "system",
      priority: "high",
      actionUrl: CEO_ROUTES.approvals,
      sourceEventKey: `executive_approval_forwarded:${request.id}`,
      createdBy: profile.userId,
    });
  }
}
