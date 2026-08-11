import { redirect } from "next/navigation";

import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";

export default function PerformancePage() {
  redirect(PERFORMANCE_ROUTES.goals);
}
