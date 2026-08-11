import { redirect } from "next/navigation";

import { DOCUMENTS_ROUTES } from "@/lib/documents/constants";

type Props = {
  params: Promise<{ employeeId: string }>;
};

export default async function DocumentsManagementEmployeeDetailRedirect({ params }: Props) {
  const { employeeId } = await params;
  redirect(DOCUMENTS_ROUTES.employeeDocument(employeeId));
}
