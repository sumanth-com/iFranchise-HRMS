import { redirect } from "next/navigation";

import { DOCUMENTS_ROUTES } from "@/lib/documents/constants";

export default function DocumentsManagementSettingsRedirect() {
  redirect(DOCUMENTS_ROUTES.settings);
}
