import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type {
  CandidateSourceItem,
  RecruitmentEmailTemplate,
  RecruitmentOfferTemplate,
  RecruitmentSettings,
} from "@/types/recruitment";
import {
  DEFAULT_CANDIDATE_SOURCES,
  DEFAULT_NOTICE_PERIOD_OPTIONS,
} from "@/lib/recruitment/constants";
import type { RecruitmentSettingsFormValues } from "@/lib/validations/recruitment";
import {
  DEFAULT_INTERVIEW_EMAIL_BODY,
  DEFAULT_INTERVIEW_EMAIL_SUBJECT,
} from "@/lib/recruitment/interview-email-content";
import {
  DEFAULT_OFFER_EMAIL_MESSAGE_TEMPLATE,
  DEFAULT_OFFER_EMAIL_SUBJECT_TEMPLATE,
} from "@/lib/recruitment/offer-email-content";

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
  offerEmailDefaults: {
    subjectTemplate: DEFAULT_OFFER_EMAIL_SUBJECT_TEMPLATE,
    messageTemplate: DEFAULT_OFFER_EMAIL_MESSAGE_TEMPLATE,
    hrEmail: "hr@ifranchise.in",
    hrPhone: "+91-9247 536532",
  },
  offerTemplates: [
    {
      id: "ifranchise_standard",
      name: "iFranchise Standard Offer Letter",
      body:
        "Dear {{candidateName}},\n\nWe are pleased to offer you the position of {{position}} at {{companyName}} with compensation of {{salary}}, joining on {{joiningDate}}.\n\nRegards,\n{{manager}}",
    },
    {
      id: "default",
      name: "Standard Offer",
      body:
        "Dear {{candidateName}},\n\nWe are pleased to offer you the position of {{position}} in the {{department}} department at {{companyName}}.\n\nYour compensation will be {{salary}}, with a joining date of {{joiningDate}}.\n\nWarm regards,\n{{manager}}\n{{companyName}}",
    },
  ],
  emailTemplates: [
    {
      id: "interview_scheduled",
      name: "Interview invitation",
      subject: DEFAULT_INTERVIEW_EMAIL_SUBJECT,
      body: DEFAULT_INTERVIEW_EMAIL_BODY,
    },
    {
      id: "offer_sent",
      name: "Offer Letter",
      subject: "Offer of Employment — {{position}}",
      body:
        "Dear {{candidateName}},\n\nPlease find your offer details below.\n\nRegards,\nHR Team",
    },
  ],
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

function normalizeOfferTemplates(raw: unknown): RecruitmentOfferTemplate[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_RECRUITMENT_SETTINGS.offerTemplates;
  }

  return raw
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const row = item as RecruitmentOfferTemplate;
      return {
        id: row.id || `offer_tpl_${index}`,
        name: String(row.name || "Offer template").trim(),
        body: String(row.body || "").trim(),
      };
    })
    .filter((item) => item.body.length > 0);
}

function normalizeEmailTemplates(raw: unknown): RecruitmentEmailTemplate[] {
  const stored =
    Array.isArray(raw) && raw.length > 0
      ? raw
          .filter((item) => item && typeof item === "object")
          .map((item, index) => {
            const row = item as RecruitmentEmailTemplate;
            return {
              id: row.id || `email_tpl_${index}`,
              name: String(row.name || "Email template").trim(),
              subject: String(row.subject || "").trim(),
              body: String(row.body || "").trim(),
            };
          })
          .filter((item) => item.subject.length > 0 && item.body.length > 0)
      : [];

  if (stored.length === 0) {
    return DEFAULT_RECRUITMENT_SETTINGS.emailTemplates;
  }

  const byId = new Set(stored.map((item) => item.id));
  const missingDefaults = DEFAULT_RECRUITMENT_SETTINGS.emailTemplates.filter(
    (item) => !byId.has(item.id),
  );
  return [...missingDefaults, ...stored];
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
    offerEmailDefaults: {
      subjectTemplate:
        String(stored?.offerEmailDefaults?.subjectTemplate ?? "").trim() ||
        DEFAULT_RECRUITMENT_SETTINGS.offerEmailDefaults.subjectTemplate,
      messageTemplate:
        String(stored?.offerEmailDefaults?.messageTemplate ?? "").trim() ||
        DEFAULT_RECRUITMENT_SETTINGS.offerEmailDefaults.messageTemplate,
      hrEmail:
        String(stored?.offerEmailDefaults?.hrEmail ?? "").trim() ||
        DEFAULT_RECRUITMENT_SETTINGS.offerEmailDefaults.hrEmail,
      hrPhone:
        String(stored?.offerEmailDefaults?.hrPhone ?? "").trim() ||
        DEFAULT_RECRUITMENT_SETTINGS.offerEmailDefaults.hrPhone,
    },
    offerTemplates: normalizeOfferTemplates(stored?.offerTemplates),
    emailTemplates: normalizeEmailTemplates(stored?.emailTemplates),
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
