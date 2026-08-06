import { redirect } from "next/navigation";

import { SELF_DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import { hubListUrl } from "@/lib/dashboard/hub-paths";

type DocumentsManagementPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentsManagementPage({
  searchParams,
}: DocumentsManagementPageProps) {
  const rawParams = await searchParams;
  const filters: Record<string, string | undefined> = {};

  Object.entries(rawParams).forEach(([key, value]) => {
    if (key === "tab" || typeof value !== "string") {
      return;
    }
    filters[key] = value;
  });

  redirect(hubListUrl(SELF_DOCUMENTS_ROUTES.team, filters));
}
