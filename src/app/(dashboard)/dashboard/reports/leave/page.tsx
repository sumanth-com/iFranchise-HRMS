import { loadModuleReportsPage } from "@/lib/reports/load-module-reports-page";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeaveReportsPage({ searchParams }: Props) {
  return loadModuleReportsPage("leave", searchParams);
}
