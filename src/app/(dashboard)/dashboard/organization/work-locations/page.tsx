import { redirect } from "next/navigation";

import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";

export default function WorkLocationsPage() {
  redirect(`${ORGANIZATION_ROUTES.branches}#work-locations`);
}
