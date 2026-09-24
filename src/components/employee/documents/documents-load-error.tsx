"use client";

import { ErrorState } from "@/components/common/error-state";

type Props = {
  message: string;
};

export function DocumentsLoadError({ message: _message }: Props) {
  return (
    <ErrorState
      title="We couldn't load this section"
      description="Please try again. If the problem continues, contact your HR administrator."
      onRetry={() => window.location.reload()}
      retryLabel="Retry"
      className="py-8"
    />
  );
}
