import { redirect } from "next/navigation";

import { DOCUMENTS_ROUTES } from "@/lib/documents/constants";

export default function DocumentsManagementTemplatesRedirect() {
  redirect(DOCUMENTS_ROUTES.templates);
}
