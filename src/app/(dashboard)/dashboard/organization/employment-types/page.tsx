import { redirect } from "next/navigation";

import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";

export default function EmploymentTypesPage() {
  redirect(ORGANIZATION_ROUTES.designations);
}
