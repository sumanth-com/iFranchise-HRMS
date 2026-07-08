import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  PerformanceSettingsData,
  PerformanceSettingsRecord,
} from "@/types/performance";
import { performanceSettingsSchema } from "@/lib/validations/performance";

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettingsData = {
  reviewCycles: {
    defaultDurationMonths: 12,
    selfReviewDays: 7,
    managerReviewDays: 14,
  },
  ratingScale: {
    min: 1,
    max: 5,
    labels: {
      "1": "Needs Improvement",
      "2": "Below Expectations",
      "3": "Meets Expectations",
      "4": "Exceeds Expectations",
      "5": "Outstanding",
    },
  },
  goalCategories: [
    "Business",
    "Technical",
    "Leadership",
    "Personal Development",
    "Customer Success",
  ],
  kpiTemplates: [],
  promotionRules: {
    minRatingForPromotion: 4,
    minTenureMonths: 12,
    requireManagerApproval: true,
    requireHrApproval: true,
  },
  notifications: {
    reviewReminder: true,
    goalDueReminder: true,
    feedbackNotification: true,
    promotionNotification: true,
    oneOnOneReminder: true,
  },
};

function parseStoredSettings(raw: unknown): PerformanceSettingsData {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_PERFORMANCE_SETTINGS;
  }
  const stored = raw as Record<string, unknown>;
  return performanceSettingsSchema.parse({
    ...DEFAULT_PERFORMANCE_SETTINGS,
    ...stored,
    reviewCycles: {
      ...DEFAULT_PERFORMANCE_SETTINGS.reviewCycles,
      ...(stored.reviewCycles as Record<string, unknown> | undefined),
    },
    ratingScale: {
      ...DEFAULT_PERFORMANCE_SETTINGS.ratingScale,
      ...(stored.ratingScale as Record<string, unknown> | undefined),
    },
    promotionRules: {
      ...DEFAULT_PERFORMANCE_SETTINGS.promotionRules,
      ...(stored.promotionRules as Record<string, unknown> | undefined),
    },
    notifications: {
      ...DEFAULT_PERFORMANCE_SETTINGS.notifications,
      ...(stored.notifications as Record<string, unknown> | undefined),
    },
    goalCategories:
      (stored.goalCategories as string[] | undefined) ??
      DEFAULT_PERFORMANCE_SETTINGS.goalCategories,
    kpiTemplates:
      (stored.kpiTemplates as string[] | undefined) ??
      DEFAULT_PERFORMANCE_SETTINGS.kpiTemplates,
  });
}

export async function getPerformanceSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<PerformanceSettingsRecord> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings, created_at, updated_at, created_by, updated_by")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const settings = parseStoredSettings(data?.settings?.performance);

  return {
    settings,
    audit: {
      createdAt: data?.created_at ?? new Date().toISOString(),
      updatedAt: data?.updated_at ?? new Date().toISOString(),
      createdByName: null,
      updatedByName: null,
    },
  };
}

export async function savePerformanceSettings(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: PerformanceSettingsData,
): Promise<PerformanceSettingsRecord> {
  const organizationId = profile.employee.organizationId;
  const parsed = performanceSettingsSchema.parse(input);

  const { data: existing, error: fetchError } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("id, settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  const currentSettings =
    existing?.settings && typeof existing.settings === "object"
      ? (existing.settings as Record<string, unknown>)
      : {};

  const nextSettings = { ...currentSettings, performance: parsed };

  if (existing?.id) {
    const { error } = await supabase
      .schema("hrms")
      .from("organization_settings")
      .update({
        settings: nextSettings,
        updated_by: profile.userId,
      })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.schema("hrms").from("organization_settings").insert({
      organization_id: organizationId,
      settings: nextSettings,
      created_by: profile.userId,
      updated_by: profile.userId,
    });

    if (error) throw new Error(error.message);
  }

  return getPerformanceSettings(supabase, organizationId);
}
