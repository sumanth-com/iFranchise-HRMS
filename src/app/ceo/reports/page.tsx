import { redirect } from "next/navigation";

import { CEO_ROUTES } from "@/lib/ceo/constants";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";

export default async function CeoReportsIndexPage() {
  await requireCeoPortal();
  redirect(`${CEO_ROUTES.reports}/attendance`);
}
