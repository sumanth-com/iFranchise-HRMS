import { PayrollTeamPage } from "@/lib/dashboard/self-service/payroll-hub-section";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PayrollTeamPageRoute({ searchParams }: PageProps) {
  return PayrollTeamPage({ searchParams });
}
