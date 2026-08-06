import { redirect } from "next/navigation";

import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

type SalaryRevisionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function SalaryRevisionsPage({
  searchParams,
}: SalaryRevisionsPageProps) {
  const raw = await searchParams;

  redirect(
    payrollHubUrl({
      tab: "team",
      section: TEAM_PAYROLL_SECTIONS.revisions,
      params: {
        page: firstString(raw.page),
        pageSize: firstString(raw.pageSize),
        revisionStatus: firstString(raw.revisionStatus),
        employeeId: firstString(raw.employeeId),
      },
    }),
  );
}
