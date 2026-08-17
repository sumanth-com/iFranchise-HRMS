"use server";

import { revalidatePath } from "next/cache";

import {
  getUserTourState,
  setTourStatusForUser,
} from "@/lib/product-tour/services/tour-state-service";
import type { UserTourStateMap } from "@/lib/product-tour/types";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const tourStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "skipped",
  "completed",
]);

const updateTourStateSchema = z.object({
  tourId: z.string().min(1).max(120),
  status: tourStatusSchema,
});

export type ProductTourActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };

function revalidateHelpPaths() {
  revalidatePath("/dashboard/help");
  revalidatePath("/ceo/help");
  revalidatePath("/manager/help");
  revalidatePath("/employee/help");
}

export async function fetchUserTourStateAction(): Promise<
  ProductTourActionResult<UserTourStateMap>
> {
  try {
    const profile = await requireAuthenticatedProfile();
    const supabase = await createClient();
    const data = await getUserTourState(supabase, profile);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load tour state",
    };
  }
}

export async function updateTourStateAction(
  input: z.infer<typeof updateTourStateSchema>,
): Promise<ProductTourActionResult<UserTourStateMap>> {
  try {
    const profile = await requireAuthenticatedProfile();
    const parsed = updateTourStateSchema.parse(input);
    const supabase = await createClient();
    const data = await setTourStatusForUser(
      supabase,
      profile,
      parsed.tourId,
      parsed.status,
    );
    revalidateHelpPaths();

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update tour state",
    };
  }
}

export async function resetTourStateAction(
  tourId: string,
): Promise<ProductTourActionResult<UserTourStateMap>> {
  return updateTourStateAction({ tourId, status: "not_started" });
}

export async function skipTourAction(tourId: string): Promise<ProductTourActionResult> {
  const result = await updateTourStateAction({ tourId, status: "skipped" });
  if (!result.success) return result;
  return { success: true, data: undefined };
}

export async function completeTourAction(tourId: string): Promise<ProductTourActionResult> {
  const result = await updateTourStateAction({ tourId, status: "completed" });
  if (!result.success) return result;
  return { success: true, data: undefined };
}
