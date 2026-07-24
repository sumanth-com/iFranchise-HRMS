import { NextResponse } from "next/server";

import { processDuePayslipPublications } from "@/lib/payroll/services/payslip-publication-worker";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteConfig } from "@/config/site";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ message: "Cron is not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: organizations, error } = await admin
      .schema("hrms")
      .from("organizations")
      .select("id")
      .is("deleted_at", null);

    if (error) {
      return NextResponse.json({ message: "Failed to load organizations" }, { status: 500 });
    }

    const origin = new URL(request.url).origin || siteConfig.url;
    let processed = 0;
    let emailed = 0;
    let skipped = 0;

    for (const organization of organizations ?? []) {
      const profile = {
        userId: "system-cron",
        email: "system-cron@internal",
        employee: {
          id: "",
          organizationId: organization.id,
          firstName: "System",
          lastName: "Cron",
        },
        roles: [],
        permissionCodes: ["payroll.view", "payslip.generate"],
      } as const;

      const result = await processDuePayslipPublications(
        admin,
        profile as never,
        origin,
        organization.id,
      );
      processed += result.processed;
      emailed += result.emailed;
      skipped += result.skipped;
    }

    return NextResponse.json({ success: true, processed, emailed, skipped });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[cron/publish-payslips]", error);
    }
    return NextResponse.json({ message: "Publication job failed" }, { status: 500 });
  }
}
