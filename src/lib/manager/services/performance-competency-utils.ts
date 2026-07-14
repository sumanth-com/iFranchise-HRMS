import type { CompetencyKey, CompetencyRatings } from "@/types/manager-performance";

export const MANAGER_COMPETENCY_FIELDS: Array<{ key: CompetencyKey; label: string }> = [
  { key: "communication", label: "Communication" },
  { key: "technicalSkills", label: "Technical Skills" },
  { key: "ownership", label: "Ownership" },
  { key: "teamwork", label: "Teamwork" },
  { key: "problemSolving", label: "Problem Solving" },
  { key: "leadership", label: "Leadership" },
  { key: "discipline", label: "Discipline" },
  { key: "innovation", label: "Innovation" },
];

type ReviewCommentsPayload = {
  competencies?: CompetencyRatings;
  managerNotes?: string | null;
  recommendPromotion?: boolean;
  recommendTraining?: boolean;
  recommendPip?: boolean;
};

export function serializeReviewCommentsPayload(payload: ReviewCommentsPayload): string {
  return JSON.stringify(payload);
}

export function parseReviewCommentsPayload(
  comments: string | null | undefined,
): ReviewCommentsPayload & { rawNotes: string | null } {
  if (!comments) {
    return { rawNotes: null };
  }

  try {
    const parsed = JSON.parse(comments) as ReviewCommentsPayload;
    if (parsed && typeof parsed === "object" && ("competencies" in parsed || "managerNotes" in parsed)) {
      return {
        ...parsed,
        rawNotes: parsed.managerNotes ?? null,
      };
    }
  } catch {
    // fall through
  }

  return { rawNotes: comments };
}

export function averageCompetencyRating(competencies: CompetencyRatings): number | null {
  const values = Object.values(competencies).filter(
    (value): value is number => typeof value === "number" && value > 0,
  );
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}
