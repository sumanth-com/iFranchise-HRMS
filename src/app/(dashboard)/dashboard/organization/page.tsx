import { redirect } from "next/navigation";

import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";

export default function OrganizationIndexPage() {
  redirect(ORGANIZATION_ROUTES.profile);
}
