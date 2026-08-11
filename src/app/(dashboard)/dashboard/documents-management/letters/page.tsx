import { redirect } from "next/navigation";

import { DOCUMENTS_ROUTES } from "@/lib/documents/constants";

export default function DocumentsManagementLettersRedirect() {
  redirect(DOCUMENTS_ROUTES.letters);
}
