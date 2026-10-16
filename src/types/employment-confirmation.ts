export type EmploymentConfirmationStatus =
  | "pending_review"
  | "confirmed"
  | "cancelled";

export type ProbationCandidateStatus =
  | "approaching"
  | "due"
  | "overdue"
  | "pending_review"
  | "confirmed";

export type ProbationCandidate = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designationId: string | null;
  designationTitle: string | null;
  employmentTypeId: string | null;
  employmentTypeName: string | null;
  employmentStatus: string;
  dateOfJoining: string | null;
  probationEndDate: string | null;
  probationDurationMonths: number;
  currentGrossSalary: number | null;
  currencyCode: string;
  fullTimeEffectiveDate: string | null;
  confirmationId: string | null;
  confirmationStatus: EmploymentConfirmationStatus | null;
  proposedDesignationId: string | null;
  proposedDesignationTitle: string | null;
  proposedGrossSalary: number | null;
  proposedEffectiveDate: string | null;
  candidateStatus: ProbationCandidateStatus;
  daysUntilProbationEnd: number | null;
};

export type EmploymentConfirmationEvent = {
  id: string;
  eventType: string;
  actorUserId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type EmploymentConfirmationDetail = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  previousDesignationId: string | null;
  previousDesignationTitle: string | null;
  newDesignationId: string | null;
  newDesignationTitle: string | null;
  previousGrossSalary: number | null;
  newGrossSalary: number;
  probationEndDate: string | null;
  effectiveDate: string;
  confirmationStatus: EmploymentConfirmationStatus;
  notes: string | null;
  salaryStructureId: string | null;
  salaryRevisionId: string | null;
  confirmedAt: string | null;
  events: EmploymentConfirmationEvent[];
};
