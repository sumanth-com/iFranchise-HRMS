import { redirect } from "next/navigation";

import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { requireManagerPortal } from "@/lib/manager/load-admin-context";

export default async function ManagerReportsIndexPage() {
  await requireManagerPortal();
  redirect(MANAGER_ROUTES.reportsAttendance);
}
