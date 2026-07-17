import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { EmailDetailRow } from "@/lib/email/branding";
import type { UserProfile } from "@/types/auth";
import type { NotificationModule } from "@/types/notifications";

/**
 * Generic request classifications the Universal Email Approval Engine can serve.
 * Only "leave" is wired today; the rest are reserved so new modules can register
 * a handler without touching the engine.
 */
export type ApprovalRequestType =
  | "leave"
  | "attendance_regularization"
  | "expense_claim"
  | "asset_request"
  | "recruitment"
  | "payroll"
  | "policy"
  | "exit_clearance"
  | "purchase_request"
  | "travel_request";

export type ApprovalDecision = "approve" | "reject";

export type PendingApprover = {
  employeeId: string;
  approvalRecordId: string;
  level: number;
};

/** Everything needed to render an approval email + the public landing page. */
export type ApprovalRequestSummary = {
  organizationId: string;
  subject: string;
  heading: string;
  employeeName: string;
  detailRows: EmailDetailRow[];
  reason: string | null;
  /** Underlying record status (e.g. leave_status). */
  status: string;
  /** Whether the request can still be actioned. */
  isPending: boolean;
};

export type DecisionRecipient = {
  email: string | null;
  name: string;
  employeeId: string;
};

/**
 * Contract every approval-based module implements to plug into the shared
 * secure email approval workflow. Handlers receive a service-role client
 * (RLS bypassed) but MUST reuse the module's own authorization-enforcing
 * mutation for approve/reject.
 */
export interface ApprovalHandler {
  type: ApprovalRequestType;
  sourceModule: NotificationModule;

  /** Load the request details used by the email + landing page. */
  loadSummary(
    admin: AuthSupabaseClient,
    sourceRecordId: string,
  ): Promise<ApprovalRequestSummary | null>;

  /** Approvers currently at the active (lowest) pending level. */
  getPendingApprovers(
    admin: AuthSupabaseClient,
    sourceRecordId: string,
  ): Promise<PendingApprover[]>;

  /** Execute approval, reusing the module's core mutation (auth enforced inside). */
  approve(
    admin: AuthSupabaseClient,
    profile: UserProfile,
    sourceRecordId: string,
    comments?: string,
  ): Promise<void>;

  /** Execute rejection, reusing the module's core mutation (auth enforced inside). */
  reject(
    admin: AuthSupabaseClient,
    profile: UserProfile,
    sourceRecordId: string,
    reason: string,
  ): Promise<void>;

  /** Stamp the acted step as email-driven for approval history. */
  markActedViaEmail(
    admin: AuthSupabaseClient,
    sourceRecordId: string,
    approverEmployeeId: string,
  ): Promise<void>;

  /** Where the "View Details" button should land for the given approver role. */
  detailPath(sourceRecordId: string, roleCode: string): string;

  /** The employee to notify by email once the request is finally decided. */
  decisionRecipient(
    admin: AuthSupabaseClient,
    sourceRecordId: string,
  ): Promise<DecisionRecipient | null>;
}

export type ApprovalTokenRow = {
  id: string;
  organization_id: string;
  request_type: ApprovalRequestType;
  source_module: NotificationModule;
  source_record_id: string;
  approval_record_id: string | null;
  approver_employee_id: string;
  approver_user_id: string | null;
  role_code: string;
  token_hash: string;
  expires_at: string;
  consumed_at: string | null;
  consumed_action: string | null;
  status: string;
  deleted_at: string | null;
};

export type TokenValidationFailure =
  | "invalid"
  | "expired"
  | "consumed";

export type PreviewOutcome =
  | {
      status: "ready";
      requestType: ApprovalRequestType;
      summary: ApprovalRequestSummary;
      approverName: string;
      detailPath: string;
    }
  | { status: "already_processed"; message: string; summary?: ApprovalRequestSummary }
  | { status: "expired"; message: string }
  | { status: "invalid"; message: string };

export type ProcessOutcome =
  | {
      status: "approved" | "rejected";
      decision: ApprovalDecision;
      employeeName: string;
      summary: ApprovalRequestSummary;
    }
  | {
      status: "already_processed" | "expired" | "invalid" | "unauthorized" | "error";
      message: string;
    };
