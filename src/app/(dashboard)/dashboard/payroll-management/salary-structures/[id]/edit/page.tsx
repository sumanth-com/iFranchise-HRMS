import { redirect } from "next/navigation";

import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditSalaryStructurePage({ params }: PageProps) {
  await params;
  redirect(
    payrollHubUrl({
      tab: "team",
      section: TEAM_PAYROLL_SECTIONS["salary-structures"],
    }),
  );
}
