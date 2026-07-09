import { redirect } from "next/navigation";

import { COMPANY_SETTINGS_ROUTES } from "@/lib/company-settings/constants";

export default function PerformanceSettingsPage() {
  redirect(COMPANY_SETTINGS_ROUTES.section("performance"));
}
