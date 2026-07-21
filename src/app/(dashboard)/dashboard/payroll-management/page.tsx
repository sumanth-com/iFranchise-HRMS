import { redirect } from "next/navigation";

type PayrollManagementPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PayrollManagementPage({
  searchParams,
}: PayrollManagementPageProps) {
  const rawParams = await searchParams;
  const params = new URLSearchParams();
  params.set("tab", "team");

  Object.entries(rawParams).forEach(([key, value]) => {
    if (key === "tab" || typeof value !== "string") {
      return;
    }
    params.set(key, value);
  });

  redirect(`/dashboard/payroll?${params.toString()}`);
}
