"use client";

import { AppRouteError } from "@/components/common/app-route-error";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ApprovalRouteError({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <AppRouteError error={error} reset={reset} />
    </div>
  );
}
