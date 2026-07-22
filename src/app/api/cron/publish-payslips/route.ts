import { NextResponse } from "next/server";

import { processDuePayslipPublications } from "@/lib/payroll/services/payslip-publication-worker";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !cronSecret) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: employee } = await supabase
      .schema("hrms")
      .from("employees")
      .select("id, organization_id, user_id")
      .eq("user_id", user?.id ?? "")
      .is("deleted_at", null)
      .maybeSingle();

    if (!employee && cronSecret) {
      return NextResponse.json(
        { message: "Cron requires service role or authenticated HR user" },
        { status: 401 },
      );
    }

    const origin = new URL(request.url).origin;
    const profile = {
      userId: user?.id ?? "system",
      employee: {
        id: employee?.id ?? "",
        organizationId: employee?.organization_id ?? "",
      },
      permissionCodes: ["payroll.view", "payslip.generate"],
    } as const;

    const result = await processDuePayslipPublications(
      supabase,
      profile as never,
      origin || siteConfig.url,
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[cron/publish-payslips]", error);
    return NextResponse.json({ message: "Publication job failed" }, { status: 500 });
  }
}
