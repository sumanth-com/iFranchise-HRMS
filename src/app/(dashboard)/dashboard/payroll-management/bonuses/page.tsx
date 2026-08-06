import { redirect } from "next/navigation";

import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

type BonusesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function BonusesPage({ searchParams }: BonusesPageProps) {
  const raw = await searchParams;

  redirect(
    payrollHubUrl({
      tab: "team",
      section: TEAM_PAYROLL_SECTIONS.bonuses,
      params: {
        page: firstString(raw.page),
        pageSize: firstString(raw.pageSize),
        search: firstString(raw.search),
        month: firstString(raw.month),
        year: firstString(raw.year),
        bonusStatus: firstString(raw.bonusStatus),
        bonusType: firstString(raw.bonusType),
        employeeId: firstString(raw.employeeId),
        departmentId: firstString(raw.departmentId),
      },
    }),
  );
}
