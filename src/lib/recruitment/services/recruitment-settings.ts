import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type {
  CandidateSourceItem,
  RecruitmentSettings,
} from "@/types/recruitment";
import {
  DEFAULT_CANDIDATE_SOURCES,
  DEFAULT_NOTICE_PERIOD_OPTIONS,
} from "@/lib/recruitment/constants";
import type { RecruitmentSettingsFormValues } from "@/lib/validations/recruitment";

export const DEFAULT_RECRUITMENT_SETTINGS: RecruitmentSettings = {
  candidateSources: DEFAULT_CANDIDATE_SOURCES.map((s) => ({ ...s })),
  defaultHiringManagerId: null,
  defaultInterviewDurationMinutes: 60,
  noticePeriodOptions: [...DEFAULT_NOTICE_PERIOD_OPTIONS],
  autoEmployeeCreation: true,
  autoArchiveRejectedDays: 90,
  emailNotifications: {
    interviewScheduled: true,
    interviewCancelled: true,
    offerSent: true,
    offerAccepted: true,
    offerRejected: true,
    joiningReminder: true,
  },
  numberFormats: {
    candidatePrefix: "CAN",
    jobPrefix: "JOB",
    offerPrefix: "OFF",
  },
};

function normalizeSources(raw: unknown): CandidateSourceItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_RECRUITMENT_SETTINGS.candidateSources;
  }

  // Legacy: string[]
  if (typeof raw[0] === "string") {
    return (raw as string[]).map((label, index) => ({
      id: `src_${index}_${label.toLowerCase().replace(/\s+/g, "_")}`,
      label,
      enabled: true,
    }));
  }

  return (raw as CandidateSourceItem[])
    .filter((s) => s && typeof s.label === "string" && s.label.trim())
    .map((s, index) => ({
      id: s.id || `src_${index}`,
      label: s.label.trim(),
      enabled: s.enabled !== false,
    }));
}

export function mergeRecruitmentSettings(
  stored?: Partial<RecruitmentSettings> | null,
): RecruitmentSettings {
  const duration = Number(stored?.defaultInterviewDurationMinutes);
  const archiveDays = Number(stored?.autoArchiveRejectedDays);

  return {
    candidateSources: normalizeSources(stored?.candidateSources),
    defaultHiringManagerId: stored?.defaultHiringManagerId ?? null,
    defaultInterviewDurationMinutes: ([30, 45, 60, 90].includes(duration)
      ? duration
      : 60) as RecruitmentSettings["defaultInterviewDurationMinutes"],
    noticePeriodOptions:
      Array.isArray(stored?.noticePeriodOptions) && stored.noticePeriodOptions.length
        ? stored.noticePeriodOptions.map(String)
        : [...DEFAULT_RECRUITMENT_SETTINGS.noticePeriodOptions],
    autoEmployeeCreation: stored?.autoEmployeeCreation !== false,
    autoArchiveRejectedDays: ([30, 60, 90, 180].includes(archiveDays)
      ? archiveDays
      : 90) as RecruitmentSettings["autoArchiveRejectedDays"],
    emailNotifications: {
      ...DEFAULT_RECRUITMENT_SETTINGS.emailNotifications,
      ...(stored?.emailNotifications ?? {}),
    },
    numberFormats: {
      ...DEFAULT_RECRUITMENT_SETTINGS.numberFormats,
      ...(stored?.numberFormats ?? {}),
      candidatePrefix: (
        stored?.numberFormats?.candidatePrefix ||
        DEFAULT_RECRUITMENT_SETTINGS.numberFormats.candidatePrefix
      )
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 10) || "CAN",
      jobPrefix: (
        stored?.numberFormats?.jobPrefix ||
        DEFAULT_RECRUITMENT_SETTINGS.numberFormats.jobPrefix
      )
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 10) || "JOB",
      offerPrefix: (
        stored?.numberFormats?.offerPrefix ||
        DEFAULT_RECRUITMENT_SETTINGS.numberFormats.offerPrefix
      )
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 10) || "OFF",
    },
  };
}

export function previewNumberFormat(prefix: string, year = new Date().getFullYear()) {
  const clean = (prefix || "XXX").toUpperCase().replace(/[^A-Z]/g, "") || "XXX";
  return `${clean}-${year}-0001`;
}

export async function getRecruitmentSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<RecruitmentSettings> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const stored = (data?.settings as { recruitment?: Partial<RecruitmentSettings> } | null)
    ?.recruitment;

  return mergeRecruitmentSettings(stored);
}

export async function updateRecruitmentSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
  input: RecruitmentSettingsFormValues,
): Promise<RecruitmentSettings> {
  const nextSettings = mergeRecruitmentSettings(input);

  const { data: existing, error: fetchError } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("id, settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  const current = (existing?.settings as Record<string, unknown> | null) ?? {};
  const next = {
    ...current,
    recruitment: nextSettings,
  };

  if (existing?.id) {
    const { error } = await supabase
      .schema("hrms")
      .from("organization_settings")
      .update({ settings: next })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.schema("hrms").from("organization_settings").insert({
      organization_id: organizationId,
      settings: next,
      status: "active",
    });
    if (error) throw new Error(error.message);
  }

  return nextSettings;
}

export async function nextRecruitmentCode(
  supabase: AuthSupabaseClient,
  organizationId: string,
  table: "recruitment_job_openings" | "recruitment_candidates" | "recruitment_offers",
  column: "job_code" | "candidate_code" | "offer_code",
  prefix: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const cleanPrefix = prefix.toUpperCase().replace(/[^A-Z]/g, "") || "XXX";
  const pattern = `${cleanPrefix}-${year}-`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.schema("hrms") as any)
    .from(table)
    .select(column)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .like(column, `${pattern}%`)
    .order(column, { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const latest = (data?.[0]?.[column] as string | undefined) ?? "";
  const match = latest.match(/(\d+)$/);
  const next = match ? Number.parseInt(match[1], 10) + 1 : 1;
  return `${pattern}${String(next).padStart(4, "0")}`;
}

export async function archiveRejectedCandidates(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<number> {
  const settings = await getRecruitmentSettings(supabase, organizationId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - settings.autoArchiveRejectedDays);
  const cutoffIso = cutoff.toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.schema("hrms") as any)
    .from("recruitment_candidates")
    .update({ archived_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("stage", "rejected")
    .is("deleted_at", null)
    .is("archived_at", null)
    .lt("rejected_at", cutoffIso)
    .select("id");

  if (error) throw new Error(error.message);
  return (data ?? []).length;
}
