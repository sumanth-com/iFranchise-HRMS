import { PayrollTeamPage } from "@/lib/dashboard/self-service/payroll-hub-section";
import { parseTeamPayrollSection } from "@/lib/payroll/constants";

type PageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PayrollTeamSectionPage({ params, searchParams }: PageProps) {
  const { section } = await params;
  const teamSection = parseTeamPayrollSection(section);

  return <PayrollTeamPage searchParams={searchParams} teamSection={teamSection} />;
}
