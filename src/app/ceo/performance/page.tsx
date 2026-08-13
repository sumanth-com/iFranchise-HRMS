import { redirect } from "next/navigation";

import { CEO_ROUTES } from "@/lib/ceo/constants";

export default function CeoPerformanceIndexPage() {
  redirect(CEO_ROUTES.performanceGoals);
}
