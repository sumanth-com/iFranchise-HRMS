import { redirect } from "next/navigation";

import { SELF_ASSETS_ROUTES } from "@/lib/assets/constants";
import { hubListUrl } from "@/lib/dashboard/hub-paths";

type AssetsManagementPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AssetsManagementPage({
  searchParams,
}: AssetsManagementPageProps) {
  const rawParams = await searchParams;
  const filters: Record<string, string | undefined> = {};

  Object.entries(rawParams).forEach(([key, value]) => {
    if (key === "tab" || typeof value !== "string") {
      return;
    }
    filters[key] = value;
  });

  redirect(hubListUrl(SELF_ASSETS_ROUTES.team, filters));
}
