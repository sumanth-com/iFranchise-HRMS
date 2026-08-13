import { redirect } from "next/navigation";

import { CEO_ROUTES } from "@/lib/ceo/constants";

export default function CeoOrganizationIndexPage() {
  redirect(CEO_ROUTES.organizationProfile);
}
