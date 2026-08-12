import { redirect } from "next/navigation";

import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";

export default function ShiftTemplatesPage() {
  redirect(ORGANIZATION_ROUTES.branches);
}
