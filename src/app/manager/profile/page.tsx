import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerProfilePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  params.set("tab", "my");

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && key !== "tab") {
      params.set(key, value);
    }
  }

  redirect(`/manager/attendance?${params.toString()}`);
}
