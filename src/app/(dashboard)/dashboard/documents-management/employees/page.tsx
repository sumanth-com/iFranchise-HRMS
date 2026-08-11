import { redirect } from "next/navigation";

import { DOCUMENTS_ROUTES } from "@/lib/documents/constants";

export default function DocumentsManagementEmployeesRedirect() {
  redirect(DOCUMENTS_ROUTES.employeeDocuments);
}
