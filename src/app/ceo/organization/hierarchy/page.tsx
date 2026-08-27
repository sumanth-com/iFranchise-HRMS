import { redirect } from "next/navigation";

import { CEO_ROUTES } from "@/lib/ceo/constants";

export default function CeoHierarchyPage() {
  redirect(CEO_ROUTES.organizationProfile);
}
