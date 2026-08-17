import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { parseTourState } from "@/lib/product-tour/tour-utils";
import type { UserProfile } from "@/types/auth";
import type { TourStatus, UserTourStateMap } from "@/lib/product-tour/types";
import { fromHrms } from "@/lib/reports/services/reports-utils";

export async function getUserTourState(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<UserTourStateMap> {
  try {
    const { data, error } = await fromHrms(supabase, "user_preferences")
      .select("tour_state")
      .eq("organization_id", profile.employee.organizationId)
      .eq("user_id", profile.userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      if (error.message.includes("tour_state")) return {};
      throw new Error(error.message);
    }
    return parseTourState(data?.tour_state);
  } catch (error) {
    if (error instanceof Error && error.message.includes("tour_state")) {
      return {};
    }
    throw error;
  }
}

export async function updateUserTourState(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  patch: UserTourStateMap,
): Promise<UserTourStateMap> {
  const organizationId = profile.employee.organizationId;
  const current = await getUserTourState(supabase, profile);
  const merged = { ...current, ...patch };

  const { data: existing } = await fromHrms(supabase, "user_preferences")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await fromHrms(supabase, "user_preferences")
      .update({
        tour_state: merged,
        updated_by: profile.userId,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await fromHrms(supabase, "user_preferences").insert({
      organization_id: organizationId,
      user_id: profile.userId,
      tour_state: merged,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    });
    if (error) throw new Error(error.message);
  }

  return merged;
}

export async function setTourStatusForUser(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  tourId: string,
  status: TourStatus,
): Promise<UserTourStateMap> {
  return updateUserTourState(supabase, profile, {
    [tourId]: {
      status,
      updatedAt: new Date().toISOString(),
    },
  });
}
