import { redirect } from "next/navigation";

import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";

export default function HierarchyPage() {
  redirect(ORGANIZATION_ROUTES.profile);
}
