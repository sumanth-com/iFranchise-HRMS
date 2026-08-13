import { redirect } from "next/navigation";

import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { requireManagerPortal } from "@/lib/manager/load-admin-context";

export default async function ManagerPerformanceIndexPage() {
  await requireManagerPortal();
  redirect(MANAGER_ROUTES.performanceGoals);
}
