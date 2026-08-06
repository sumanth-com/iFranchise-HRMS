import { redirect } from "next/navigation";

import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

type PayrollManagementPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function PayrollManagementPage({
  searchParams,
}: PayrollManagementPageProps) {
  const rawParams = await searchParams;

  redirect(
    payrollHubUrl({
      tab: "team",
      section: TEAM_PAYROLL_SECTIONS.dashboard,
      params: {
        month: firstString(rawParams.month),
        year: firstString(rawParams.year),
      },
    }),
  );
}
