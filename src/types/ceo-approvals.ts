import type { LookupOption } from "@/types/employee";

export type ExecutiveApprovalType =
  | "senior_hiring"
  | "department_creation"
  | "department_closure"
  | "budget_approval"
  | "salary_revision"
  | "executive_promotion"
  | "organization_policy"
  | "new_branch"
  | "asset_purchase"
  | "strategic_recruitment"
  | "organization_structure";

export type ExecutiveApprovalPriority = "low" | "medium" | "high" | "critical";

export type ExecutiveApprovalStatus =
  | "submitted"
  | "reviewed"
  | "escalated"
  | "pending_ceo"
  | "clarification_requested"
  | "revision_requested"
  | "approved"
  | "rejected"
  | "completed"
  | "forwarded";

export type CeoApprovalsListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  approvalType?: ExecutiveApprovalType;
  priority?: ExecutiveApprovalPriority;
  departmentId?: string;
  status?: ExecutiveApprovalStatus;
  requestedById?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type CeoApprovalsKpis = {
  totalPending: number;
  highPriority: number;
  waitingThisWeek: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  averageApprovalTimeHours: number;
  overdueRequests: number;
  escalatedRequests: number;
};

export type CeoApprovalsCategoryCount = {
  type: ExecutiveApprovalType;
  label: string;
  pending: number;
  total: number;
};

export type CeoApprovalsQueueRow = {
  id: string;
  requestCode: string;
  approvalType: ExecutiveApprovalType;
  approvalTypeLabel: string;
  title: string;
  departmentId: string | null;
  departmentName: string | null;
  requestedById: string | null;
  requestedByName: string | null;
  submittedAt: string;
  priority: ExecutiveApprovalPriority;
  status: ExecutiveApprovalStatus;
  statusLabel: string;
  dueAt: string | null;
  isOverdue: boolean;
  financialImpact: number;
};

export type CeoApprovalsQueueResult = {
  data: CeoApprovalsQueueRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type CeoApprovalsDocumentItem = {
  name: string;
  url?: string | null;
  path?: string | null;
  meta?: string | null;
};

export type CeoApprovalsTimelineItem = {
  id: string;
  eventKey: string;
  title: string;
  description: string | null;
  occurredAt: string;
  actorName: string | null;
};

export type CeoApprovalsHistoryItem = {
  id: string;
  decision: string;
  reason: string | null;
  decidedAt: string;
  actorName: string | null;
};

export type CeoApprovalsCommentItem = {
  id: string;
  commentText: string;
  isExecutiveRemark: boolean;
  authorName: string | null;
  createdAt: string;
};

export type CeoApprovalsDetail = {
  id: string;
  requestCode: string;
  approvalType: ExecutiveApprovalType;
  approvalTypeLabel: string;
  title: string;
  summary: string | null;
  businessJustification: string | null;
  financialImpact: number;
  riskAssessment: string | null;
  priority: ExecutiveApprovalPriority;
  status: ExecutiveApprovalStatus;
  statusLabel: string;
  departmentId: string | null;
  departmentName: string | null;
  requestedById: string | null;
  requestedByName: string | null;
  requestedByEmail: string | null;
  reviewedByName: string | null;
  escalatedByName: string | null;
  decidedByName: string | null;
  forwardedToName: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  escalatedAt: string | null;
  dueAt: string | null;
  decidedAt: string | null;
  completedAt: string | null;
  executiveRemarks: string | null;
  decisionReason: string | null;
  sourceModule: string | null;
  sourceRecordId: string | null;
  supportingDocuments: CeoApprovalsDocumentItem[];
  attachments: CeoApprovalsDocumentItem[];
  timeline: CeoApprovalsTimelineItem[];
  previousDecisions: CeoApprovalsHistoryItem[];
  comments: CeoApprovalsCommentItem[];
  canAct: boolean;
};

export type CeoApprovalsInsights = {
  pendingByDepartment: { label: string; value: number }[];
  pendingByPriority: { label: string; value: number }[];
  approvalTurnaroundHours: { label: string; value: number }[];
  monthlyApprovalTrend: { label: string; value: number }[];
  approvalSuccessRate: number;
  averageProcessingTimeHours: number;
};

export type CeoApprovalsFilterLookups = {
  departments: LookupOption[];
  requesters: LookupOption[];
  forwardTargets: LookupOption[];
};

export type CeoApprovalsPageData = {
  kpis: CeoApprovalsKpis;
  categories: CeoApprovalsCategoryCount[];
  queue: CeoApprovalsQueueResult;
  insights: CeoApprovalsInsights;
  lookups: CeoApprovalsFilterLookups;
};

export type CeoApprovalsActionResult =
  | { success: true; message: string }
  | { success: false; message: string };
