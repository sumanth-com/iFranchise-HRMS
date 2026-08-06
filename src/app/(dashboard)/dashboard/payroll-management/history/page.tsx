import { redirect } from "next/navigation";

import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

type PayrollHistoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function PayrollHistoryPage({
  searchParams,
}: PayrollHistoryPageProps) {
  const raw = await searchParams;

  redirect(
    payrollHubUrl({
      tab: "team",
      section: TEAM_PAYROLL_SECTIONS.history,
      params: {
        page: firstString(raw.page),
        pageSize: firstString(raw.pageSize),
        search: firstString(raw.search),
        month: firstString(raw.month),
        year: firstString(raw.year),
        payrollStatus: firstString(raw.payrollStatus),
        employeeId: firstString(raw.employeeId),
      },
    }),
  );
}
