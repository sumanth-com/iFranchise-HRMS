import { loadModuleReportsPage } from "@/lib/reports/load-module-reports-page";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RecruitmentReportsPage({ searchParams }: Props) {
  return loadModuleReportsPage("recruitment", searchParams);
}
