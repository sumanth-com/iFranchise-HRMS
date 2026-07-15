import type {
  ExecutiveApprovalPriority,
  ExecutiveApprovalStatus,
  ExecutiveApprovalType,
} from "@/types/ceo-approvals";

export const EXECUTIVE_APPROVAL_TYPE_LABELS: Record<ExecutiveApprovalType, string> = {
  senior_hiring: "Senior Hiring Approval",
  department_creation: "Department Creation",
  department_closure: "Department Closure",
  budget_approval: "Budget Approval",
  salary_revision: "Salary Revision Above Threshold",
  executive_promotion: "Executive Promotion",
  organization_policy: "Organization Policy Approval",
  new_branch: "New Branch Approval",
  asset_purchase: "Asset Purchase Above Approval Limit",
  strategic_recruitment: "Strategic Recruitment Approval",
  organization_structure: "Organization Structure Changes",
};

export const EXECUTIVE_APPROVAL_TYPES = Object.keys(
  EXECUTIVE_APPROVAL_TYPE_LABELS,
) as ExecutiveApprovalType[];

export const EXECUTIVE_APPROVAL_PRIORITY_LABELS: Record<
  ExecutiveApprovalPriority,
  string
> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const EXECUTIVE_APPROVAL_STATUS_LABELS: Record<ExecutiveApprovalStatus, string> = {
  submitted: "Submitted",
  reviewed: "Reviewed",
  escalated: "Escalated",
  pending_ceo: "Pending CEO",
  clarification_requested: "Clarification Requested",
  revision_requested: "Revision Requested",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  forwarded: "Forwarded",
};

export const CEO_PENDING_APPROVAL_STATUSES: ExecutiveApprovalStatus[] = [
  "pending_ceo",
  "escalated",
  "clarification_requested",
  "revision_requested",
  "forwarded",
];

export const CEO_ACTIONABLE_APPROVAL_STATUSES: ExecutiveApprovalStatus[] = [
  "pending_ceo",
  "escalated",
  "forwarded",
];

/** Salary increase threshold (INR) requiring CEO authorization */
export const CEO_SALARY_REVISION_DELTA_THRESHOLD = 25_000;

/** Relative increase threshold requiring CEO authorization */
export const CEO_SALARY_REVISION_PERCENT_THRESHOLD = 15;

export const CEO_APPROVALS_SOURCE = {
  recruitmentCandidate: "recruitment_candidates",
  performancePromotion: "performance_promotions",
  salaryRevision: "salary_revisions",
  payroll: "payrolls",
} as const;
