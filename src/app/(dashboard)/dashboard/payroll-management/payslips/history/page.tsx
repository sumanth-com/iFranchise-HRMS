import { redirect } from "next/navigation";

import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function HrPayslipHistoryPage({ searchParams }: PageProps) {
  const raw = await searchParams;

  redirect(
    payrollHubUrl({
      tab: "team",
      section: TEAM_PAYROLL_SECTIONS.payslips,
      params: {
        page: firstString(raw.page),
        pageSize: firstString(raw.pageSize),
        search: firstString(raw.search),
        month: firstString(raw.month),
        year: firstString(raw.year),
        yearFilter: firstString(raw.yearFilter),
        employeeId: firstString(raw.employeeId),
        includeArchived: raw.includeArchived === "true" ? "true" : undefined,
      },
    }),
  );
}
