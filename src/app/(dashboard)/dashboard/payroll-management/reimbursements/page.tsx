import { redirect } from "next/navigation";

import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

type ReimbursementsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ReimbursementsPage({
  searchParams,
}: ReimbursementsPageProps) {
  const raw = await searchParams;

  redirect(
    payrollHubUrl({
      tab: "team",
      section: TEAM_PAYROLL_SECTIONS.reimbursements,
      params: {
        page: firstString(raw.page),
        pageSize: firstString(raw.pageSize),
        month: firstString(raw.month),
        year: firstString(raw.year),
        reimbursementStatus: firstString(raw.reimbursementStatus),
        category: firstString(raw.category),
      },
    }),
  );
}
