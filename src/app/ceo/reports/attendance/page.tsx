import { loadModuleReportsPage } from "@/lib/reports/load-module-reports-page";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CeoAttendanceReportsPage({ searchParams }: Props) {
  return loadModuleReportsPage("attendance", searchParams);
}
