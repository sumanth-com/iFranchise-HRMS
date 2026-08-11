import { redirect } from "next/navigation";

import { DOCUMENTS_ROUTES } from "@/lib/documents/constants";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentsManagementExpiringRedirect({
  searchParams,
}: Props) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  Object.entries(raw).forEach(([key, value]) => {
    if (typeof value === "string") params.set(key, value);
  });
  const query = params.toString();
  redirect(query ? `${DOCUMENTS_ROUTES.expiring}?${query}` : DOCUMENTS_ROUTES.expiring);
}
