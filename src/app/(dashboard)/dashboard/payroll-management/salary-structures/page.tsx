import { redirect } from "next/navigation";

import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

type SalaryStructuresPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function SalaryStructuresPage({
  searchParams,
}: SalaryStructuresPageProps) {
  const raw = await searchParams;

  redirect(
    payrollHubUrl({
      tab: "team",
      section: TEAM_PAYROLL_SECTIONS["salary-structures"],
      params: {
        page: firstString(raw.page),
        pageSize: firstString(raw.pageSize),
        search: firstString(raw.search),
        employeeId: firstString(raw.employeeId),
      },
    }),
  );
}
