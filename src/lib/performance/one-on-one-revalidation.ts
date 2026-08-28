import { revalidatePath } from "next/cache";

import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";

/**
 * Every route that renders 1:1 meetings, across all portals.
 *
 * A meeting belongs to two participants who may sit in different portals, so a
 * write has to invalidate both sides — revalidating only the HR management route
 * leaves the other participant looking at a stale cached list.
 */
const ONE_ON_ONE_ROUTES = [
  PERFORMANCE_ROUTES.oneOnOnes,
  "/manager/performance/one-on-ones",
  "/ceo/performance/one-on-ones",
  // Personal "my 1:1s" views, one per portal.
  "/employee/goals/one-on-ones",
  "/manager/goals/one-on-ones",
  "/dashboard/my-goals/one-on-ones",
  "/dashboard/system/goals/one-on-ones",
] as const;

export function revalidateOneOnOnePaths(): void {
  for (const route of ONE_ON_ONE_ROUTES) {
    revalidatePath(route);
  }
}
