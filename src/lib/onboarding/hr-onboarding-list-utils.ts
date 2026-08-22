import type { OnboardingCaseListItem, OnboardingStatus } from "@/types/onboarding";

export const ONBOARDING_HR_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "ready", label: "Ready for invitation" },
  { value: "invitation_sent", label: "Invitation sent" },
  { value: "invitation_viewed", label: "Invitation viewed" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "pending_hr_review", label: "Pending HR review" },
  { value: "corrections_requested", label: "Corrections requested" },
  { value: "rejected", label: "Rejected" },
] as const;

const DONE_STATUSES: OnboardingStatus[] = ["completed", "employee_created", "approved"];
const ACTIVE_PROGRESS_STATUSES: OnboardingStatus[] = [
  "in_progress",
  "documents_uploaded",
  "corrections_requested",
  "invitation_viewed",
  "pending_hr_review",
];

export function isOnboardingListDone(row: Pick<OnboardingCaseListItem, "status" | "completionPercent">) {
  return row.completionPercent >= 100 || DONE_STATUSES.includes(row.status);
}

export function isOnboardingListInProgress(
  row: Pick<OnboardingCaseListItem, "status" | "completionPercent">,
) {
  if (isOnboardingListDone(row)) return false;
  return row.completionPercent > 0 || ACTIVE_PROGRESS_STATUSES.includes(row.status);
}

export function getHrOnboardingListStatus(row: OnboardingCaseListItem): {
  label: string;
  badgeClass: string;
} {
  if (isOnboardingListDone(row)) {
    return { label: "Done", badgeClass: "bg-emerald-100 text-emerald-800" };
  }
  if (isOnboardingListInProgress(row)) {
    return { label: "In progress", badgeClass: "bg-indigo-100 text-indigo-800" };
  }
  if (row.status === "draft") {
    return { label: "Ready for invitation", badgeClass: "bg-sky-100 text-sky-800" };
  }
  if (row.status === "invitation_sent") {
    return { label: "Invitation sent", badgeClass: "bg-blue-100 text-blue-800" };
  }
  if (row.status === "corrections_requested") {
    return { label: "Corrections requested", badgeClass: "bg-orange-100 text-orange-800" };
  }
  if (row.status === "pending_hr_review") {
    return { label: "Pending HR review", badgeClass: "bg-amber-100 text-amber-800" };
  }
  if (row.status === "rejected") {
    return { label: "Rejected", badgeClass: "bg-red-100 text-red-800" };
  }
  if (row.status === "cancelled") {
    return { label: "Cancelled", badgeClass: "bg-red-100 text-red-800" };
  }
  return { label: "In progress", badgeClass: "bg-indigo-100 text-indigo-800" };
}

export function buildJoiningMonthOptions() {
  return [
    { value: "all", label: "All months" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];
}

const JOINING_DATE_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Timezone-safe joining date for SSR/client hydration (date portion only). */
export function formatOnboardingJoiningDate(value: string | null | undefined): string {
  if (!value?.trim()) return "—";

  const dateOnly = value.trim().slice(0, 10);
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "—";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "—";

  return `${day} ${JOINING_DATE_MONTHS[month - 1]} ${year}`;
}

export function buildJoiningYearOptions(anchorYear: number) {
  const years = [{ value: "all", label: "All years" }];
  for (let year = anchorYear + 1; year >= anchorYear - 3; year -= 1) {
    years.push({ value: String(year), label: String(year) });
  }
  return years;
}
