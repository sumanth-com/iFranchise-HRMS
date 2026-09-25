"use client";

import { AppRouteError } from "@/components/common/app-route-error";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Isolates Leave Balance route failures from the rest of Approvals. */
export default function CeoLeaveBalanceError({ error, reset }: ErrorProps) {
  return <AppRouteError error={error} reset={reset} />;
}
