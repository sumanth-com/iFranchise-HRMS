"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import {
  listCeoExitApprovalQueue,
  listCeoProcessedExitApprovals,
} from "@/lib/ceo/services/ceo-exit-queries";
import { decideResignation } from "@/lib/exit/services/exit-mutations";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { ceoLeaveCalendarSchema } from "@/lib/validations/ceo-leave";
import {
  resignationDecisionSchema,
} from "@/lib/validations/exit";
import type { ExitResignationItem } from "@/types/exit";

const VIEW_PERMISSIONS = [
  PORTAL_PERMISSIONS.ceo,
  "exit.view",
  "exit.approve",
];

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };

export async function fetchCeoExitApprovalQueueAction(
  rawFilters: { month?: number; year?: number } = {},
): Promise<
  ActionResult<{
    queue: ExitResignationItem[];
    processed: ExitResignationItem[];
    month: number;
    year: number;
  }>
> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const supabase = await createClient();
    const now = new Date();
    const parsed = ceoLeaveCalendarSchema.parse({
      month: rawFilters.month ?? now.getMonth() + 1,
      year: rawFilters.year ?? now.getFullYear(),
    });
    const period = { month: parsed.month, year: parsed.year };

    const [queue, processed] = await Promise.all([
      listCeoExitApprovalQueue(supabase, profile),
      listCeoProcessedExitApprovals(supabase, profile, period).catch((error) => {
        console.error("[ceo-exit] processed list failed", error);
        return [] as ExitResignationItem[];
      }),
    ]);

    return { success: true, data: { queue, processed, ...period } };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load exit approval queue",
    };
  }
}

export async function decideCeoExitAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.ceo,
      "exit.approve",
    ]);
    const supabase = await createClient();
    const parsed = resignationDecisionSchema.parse(input);
    await decideResignation(supabase, profile, parsed, "ceo");
    revalidatePath(CEO_ROUTES.approvalsExit);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to process CEO exit decision",
    };
  }
}
