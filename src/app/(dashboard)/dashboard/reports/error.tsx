"use client";

import { AppRouteError } from "@/components/common/app-route-error";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ReportsError({ error, reset }: ErrorProps) {
  return <AppRouteError error={error} reset={reset} />;
}
