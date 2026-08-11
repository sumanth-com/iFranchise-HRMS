import { redirect } from "next/navigation";

import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";

export default function PerformanceHistoryPage() {
  redirect(PERFORMANCE_ROUTES.goals);
}
