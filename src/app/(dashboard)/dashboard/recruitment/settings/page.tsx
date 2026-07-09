import { redirect } from "next/navigation";

import { COMPANY_SETTINGS_ROUTES } from "@/lib/company-settings/constants";

export default function RecruitmentSettingsPage() {
  redirect(COMPANY_SETTINGS_ROUTES.section("recruitment"));
}
