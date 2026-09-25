"use client";

import { AppRouteError } from "@/components/common/app-route-error";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Keeps CEO shell + Approvals sub-nav when a child approvals page fails. */
export default function CeoApprovalsError({ error, reset }: ErrorProps) {
  return <AppRouteError error={error} reset={reset} />;
}
