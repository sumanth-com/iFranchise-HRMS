"use server";

import { ceoOrViewPermission } from "@/lib/ceo/read-only-permissions";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { getOfferWorkspaceCandidateById } from "@/lib/recruitment/services/recruitment-queries";
import type { CandidateDetail } from "@/types/recruitment";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

export async function getOfferWorkspaceCandidateAction(
  id: string,
): Promise<ActionResult<CandidateDetail>> {
  try {
    const profile = await requireServerAnyPermission(ceoOrViewPermission("recruitment.view"));
    const supabase = await createClient();
    const detail = await getOfferWorkspaceCandidateById(
      supabase,
      profile.employee.organizationId,
      id,
    );
    if (!detail) {
      return { success: false, message: "Candidate not found" };
    }
    return { success: true, data: detail };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load candidate",
    };
  }
}
