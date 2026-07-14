import type {
  InterviewCompetencyKey,
  InterviewCompetencyRatings,
  OverallHireRecommendation,
} from "@/types/manager-recruitment";
import type { InterviewRecommendation } from "@/types/recruitment";

export const MANAGER_INTERVIEW_COMPETENCY_FIELDS: Array<{
  key: InterviewCompetencyKey;
  label: string;
}> = [
  { key: "technicalSkills", label: "Technical Skills" },
  { key: "problemSolving", label: "Problem Solving" },
  { key: "communication", label: "Communication" },
  { key: "cultureFit", label: "Culture Fit" },
  { key: "leadership", label: "Leadership" },
  { key: "confidence", label: "Confidence" },
];

export const OVERALL_HIRE_RECOMMENDATION_LABELS: Record<OverallHireRecommendation, string> = {
  strong_hire: "Strong Hire",
  hire: "Hire",
  hold: "Hold",
  reject: "Reject",
};

type InterviewEvaluationPayload = {
  version?: 1;
  competencies?: InterviewCompetencyRatings;
  overallRecommendation?: OverallHireRecommendation;
  strengths?: string | null;
  improvements?: string | null;
  confidentialNotes?: string | null;
  draft?: boolean;
};

type OfferNotesPayload = {
  managerApproval?: {
    recommendation: "approve" | "revise" | "reject";
    notes?: string | null;
    managerId: string;
    at: string;
  };
  hrNotes?: string | null;
};

export function mapOverallToInterviewRecommendation(
  overall: OverallHireRecommendation,
): InterviewRecommendation {
  if (overall === "reject") return "reject";
  if (overall === "hold") return "next_round";
  if (overall === "strong_hire" || overall === "hire") return "offer";
  return "next_round";
}

export function averageInterviewCompetencyRating(
  competencies: InterviewCompetencyRatings,
): number | null {
  const values = Object.values(competencies).filter(
    (value): value is number => typeof value === "number" && value > 0,
  );
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function serializeInterviewEvaluationPayload(payload: InterviewEvaluationPayload): string {
  return JSON.stringify({ ...payload, version: 1 });
}

export function parseInterviewEvaluationPayload(comments: string | null | undefined): {
  competencies: InterviewCompetencyRatings;
  overallRecommendation: OverallHireRecommendation | null;
  strengths: string | null;
  improvements: string | null;
  confidentialNotes: string | null;
  draft: boolean;
  rawNotes: string | null;
} {
  if (!comments) {
    return {
      competencies: {},
      overallRecommendation: null,
      strengths: null,
      improvements: null,
      confidentialNotes: null,
      draft: false,
      rawNotes: null,
    };
  }

  try {
    const parsed = JSON.parse(comments) as InterviewEvaluationPayload;
    if (parsed && typeof parsed === "object" && parsed.version === 1) {
      return {
        competencies: parsed.competencies ?? {},
        overallRecommendation: parsed.overallRecommendation ?? null,
        strengths: parsed.strengths ?? null,
        improvements: parsed.improvements ?? null,
        confidentialNotes: parsed.confidentialNotes ?? null,
        draft: Boolean(parsed.draft),
        rawNotes: parsed.strengths ?? parsed.improvements ?? null,
      };
    }
  } catch {
    // fall through
  }

  return {
    competencies: {},
    overallRecommendation: null,
    strengths: null,
    improvements: null,
    confidentialNotes: null,
    draft: false,
    rawNotes: comments,
  };
}

export function serializeOfferNotesPayload(payload: OfferNotesPayload, hrNotes?: string | null) {
  return JSON.stringify({
    managerApproval: payload.managerApproval,
    hrNotes: hrNotes ?? payload.hrNotes ?? null,
  });
}

export function parseOfferNotesPayload(notes: string | null | undefined): {
  managerRecommendation: "approve" | "revise" | "reject" | null;
  managerNotes: string | null;
  recommendedAt: string | null;
  hrNotes: string | null;
  rawNotes: string | null;
} {
  if (!notes) {
    return {
      managerRecommendation: null,
      managerNotes: null,
      recommendedAt: null,
      hrNotes: null,
      rawNotes: null,
    };
  }

  try {
    const parsed = JSON.parse(notes) as OfferNotesPayload;
    if (parsed && typeof parsed === "object" && parsed.managerApproval) {
      return {
        managerRecommendation: parsed.managerApproval.recommendation,
        managerNotes: parsed.managerApproval.notes ?? null,
        recommendedAt: parsed.managerApproval.at,
        hrNotes: parsed.hrNotes ?? null,
        rawNotes: null,
      };
    }
  } catch {
    // fall through
  }

  return {
    managerRecommendation: null,
    managerNotes: null,
    recommendedAt: null,
    hrNotes: null,
    rawNotes: notes,
  };
}
