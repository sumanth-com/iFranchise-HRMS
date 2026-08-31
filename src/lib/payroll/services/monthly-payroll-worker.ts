/**
 * Idempotent monthly payroll generation + payslip finalization for cron.
 * Safe to run repeatedly: unique org+month payroll and payslip-per-item prevent duplicates.
 * Does not recalculate locked/approved/paid historical runs.
 */
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  generatePayrollRun,
  generatePayslips,
  processPayrollRun,
} from "@/lib/payroll/services/payroll-mutations";
import { getPreviousPayrollMonthParts } from "@/lib/payroll/services/payslip-publication";
import { getPayrollMonthDate } from "@/lib/payroll/services/payroll-utils";
import type { UserProfile } from "@/types/auth";

export type MonthlyPayrollEnsureResult = {
  organizationId: string;
  payrollMonth: string;
  action:
    | "already_finalized"
    | "generated_and_finalized"
    | "finalized_existing_draft"
    | "skipped_locked"
    | "skipped_no_eligible_employees"
    | "error";
  payrollId?: string;
  message?: string;
};

export { getPreviousPayrollMonthParts };

function systemActorId(profile: UserProfile): string | null {
  const id = profile.userId?.trim();
  if (!id || id === "system-cron") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  )
    ? id
    : null;
}

export async function ensureMonthlyPayrollFinalized(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  month: number,
  year: number,
): Promise<MonthlyPayrollEnsureResult> {
  const organizationId = profile.employee.organizationId;
  const payrollMonth = getPayrollMonthDate(month, year);
  const actorId = systemActorId(profile);

  const { data: existing, error } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("id, payroll_status, is_locked")
    .eq("organization_id", organizationId)
    .eq("payroll_month", payrollMonth)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return {
      organizationId,
      payrollMonth,
      action: "error",
      message: error.message,
    };
  }

  if (
    existing &&
    (existing.is_locked ||
      existing.payroll_status === "approved" ||
      existing.payroll_status === "paid")
  ) {
    // Ensure payslip rows exist (idempotent) even if a prior run locked without slips.
    try {
      await generatePayslips(supabase, profile, existing.id);
    } catch {
      // Ignore if already complete
    }
    return {
      organizationId,
      payrollMonth,
      action: "already_finalized",
      payrollId: existing.id,
    };
  }

  let payrollId = existing?.id;
  let action: MonthlyPayrollEnsureResult["action"] = "finalized_existing_draft";

  try {
    if (
      !payrollId ||
      existing?.payroll_status === "draft" ||
      existing?.payroll_status === "processing"
    ) {
      payrollId = await generatePayrollRun(supabase, profile, { month, year });
      action = existing ? "finalized_existing_draft" : "generated_and_finalized";
    }

    if (!payrollId) {
      return {
        organizationId,
        payrollMonth,
        action: "skipped_no_eligible_employees",
      };
    }

    const { count } = await supabase
      .schema("hrms")
      .from("payroll_items")
      .select("id", { count: "exact", head: true })
      .eq("payroll_id", payrollId)
      .is("deleted_at", null);

    if ((count ?? 0) === 0) {
      return {
        organizationId,
        payrollMonth,
        action: "skipped_no_eligible_employees",
        payrollId,
      };
    }

    const { data: current } = await supabase
      .schema("hrms")
      .from("payrolls")
      .select("payroll_status, is_locked")
      .eq("id", payrollId)
      .maybeSingle();

    if (current?.is_locked) {
      try {
        await generatePayslips(supabase, profile, payrollId);
      } catch {
        // already complete
      }
      return {
        organizationId,
        payrollMonth,
        action: "already_finalized",
        payrollId,
      };
    }

    if (current?.payroll_status === "draft") {
      await processPayrollRun(supabase, profile, payrollId);
    }

    // Cron auto-finalizes: lock + create payslips with published_at = 5th of next month.
    // Manual multi-step HR approvals remain available for HR-initiated runs.
    const { error: finalizeError } = await supabase
      .schema("hrms")
      .from("payrolls")
      .update({
        payroll_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: actorId,
        is_locked: true,
        updated_by: actorId,
      })
      .eq("id", payrollId)
      .eq("is_locked", false);

    if (finalizeError) throw new Error(finalizeError.message);

    await generatePayslips(supabase, profile, payrollId);

    return {
      organizationId,
      payrollMonth,
      action,
      payrollId,
    };
  } catch (err) {
    return {
      organizationId,
      payrollMonth,
      action: "error",
      payrollId,
      message: err instanceof Error ? err.message : "Monthly payroll failed",
    };
  }
}

export async function ensurePreviousMonthPayrollForAllOrganizations(
  admin: AuthSupabaseClient,
  systemProfileFactory: (organizationId: string) => UserProfile,
  now = new Date(),
): Promise<MonthlyPayrollEnsureResult[]> {
  const { month, year } = getPreviousPayrollMonthParts(now);
  const { data: organizations, error } = await admin
    .schema("hrms")
    .from("organizations")
    .select("id")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const results: MonthlyPayrollEnsureResult[] = [];
  for (const organization of organizations ?? []) {
    const profile = systemProfileFactory(organization.id);
    results.push(await ensureMonthlyPayrollFinalized(admin, profile, month, year));
  }
  return results;
}
