import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { formatCleanEmployeeName } from "@/lib/employees/parse-employee-name";
import type { CandidateStage, InterviewStatus } from "@/types/recruitment";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PerfRow = Record<string, any>;

export function fromHrms(supabase: AuthSupabaseClient, table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.schema("hrms") as any).from(table);
}

export function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function formatEmployeeName(first?: string | null, last?: string | null) {
  return formatCleanEmployeeName(first, last) || "—";
}

export function parseSkills(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function emptyToNull(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

/** Incomplete interviews first; within each group, latest date/time first. */
export function sortInterviewsForDisplay<
  T extends {
    interviewStatus: InterviewStatus;
    interviewDate: string;
    interviewTime?: string | null;
    createdAt?: string | null;
  },
>(interviews: T[]): T[] {
  const statusRank = (status: InterviewStatus) => {
    switch (status) {
      case "scheduled":
        return 0;
      case "no_show":
        return 1;
      case "cancelled":
        return 2;
      case "completed":
        return 3;
      default:
        return 1;
    }
  };

  return [...interviews].sort((left, right) => {
    const byStatus = statusRank(left.interviewStatus) - statusRank(right.interviewStatus);
    if (byStatus !== 0) return byStatus;

    const leftWhen = `${left.interviewDate}T${left.interviewTime || "00:00"}`;
    const rightWhen = `${right.interviewDate}T${right.interviewTime || "00:00"}`;
    const byWhen = rightWhen.localeCompare(leftWhen);
    if (byWhen !== 0) return byWhen;

    return String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""));
  });
}

export function nextStageAfterRecommendation(
  recommendation: "reject" | "next_round" | "offer",
  current: CandidateStage,
): CandidateStage {
  if (recommendation === "reject") return "rejected";
  if (recommendation === "offer") return "offer";
  const order: CandidateStage[] = [
    "applied",
    "screening",
    "technical",
    "hr",
    "ceo",
    "offer",
  ];
  const idx = order.indexOf(current);
  return order[Math.min(idx + 1, order.length - 1)] ?? "offer";
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
