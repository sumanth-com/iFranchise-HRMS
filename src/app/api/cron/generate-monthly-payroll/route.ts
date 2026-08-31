import { NextResponse } from "next/server";

import { ensurePreviousMonthPayrollForAllOrganizations } from "@/lib/payroll/services/monthly-payroll-worker";
import { getCronSecret } from "@/lib/security/token-secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types/auth";

function systemPayrollProfile(organizationId: string): UserProfile {
  return {
    userId: "system-cron",
    email: "system-cron@internal",
    employee: {
      id: "",
      organizationId,
      branchId: "",
      employeeCode: "SYSTEM",
      firstName: "System",
      lastName: "Cron",
      email: "system-cron@internal",
      employmentStatus: "active",
      accountStatus: "active",
      status: "active",
    },
    organization: {
      id: organizationId,
      name: "System",
      legalName: null,
      email: null,
      logoStoragePath: null,
      logoUrl: null,
      status: "active",
    },
    roles: [],
    permissions: [],
    permissionCodes: [
      "payroll.view",
      "payroll.create",
      "payroll.edit",
      "payroll.approve",
      "payslip.generate",
      "salary.edit",
    ],
  } as unknown as UserProfile;
}

/**
 * Idempotent monthly payroll generation for the previous IST calendar month.
 * Creates draft → processes → locks → generates payslips (published_at = 5th of following month).
 * Does not duplicate runs or overwrite finalized history.
 */
export async function GET(request: Request) {
  const cronSecret = getCronSecret();
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const results = await ensurePreviousMonthPayrollForAllOrganizations(
      admin,
      systemPayrollProfile,
    );

    const summary = {
      success: true,
      generatedAndFinalized: results.filter((r) => r.action === "generated_and_finalized").length,
      finalizedExistingDraft: results.filter((r) => r.action === "finalized_existing_draft")
        .length,
      alreadyFinalized: results.filter((r) => r.action === "already_finalized").length,
      skipped: results.filter(
        (r) =>
          r.action === "skipped_locked" || r.action === "skipped_no_eligible_employees",
      ).length,
      errors: results.filter((r) => r.action === "error").length,
      results,
    };

    return NextResponse.json(summary);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[cron/generate-monthly-payroll]", error);
    }
    return NextResponse.json({ message: "Monthly payroll job failed" }, { status: 500 });
  }
}
