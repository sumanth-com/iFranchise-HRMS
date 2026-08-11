import { redirect } from "next/navigation";

import { legacyHubTabRedirectUrl } from "@/lib/dashboard/hub-paths";
import {
  payrollHubUrl,
  SELF_PAYROLL_ROUTES,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function collectStringParams(
  raw: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      params[key] = value;
    }
  }
  return params;
}

export default async function PayrollTeamPageRoute({ searchParams }: PageProps) {
  const raw = await searchParams;
  const legacy = legacyHubTabRedirectUrl(SELF_PAYROLL_ROUTES.list, raw, {
    teamSubPathFromSection: true,
  });
  if (legacy) redirect(legacy);

  redirect(
    payrollHubUrl({
      tab: "team",
      section: TEAM_PAYROLL_SECTIONS.run,
      params: collectStringParams(raw),
    }),
  );
}
