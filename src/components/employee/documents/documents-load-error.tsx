"use client";

import { ErrorState } from "@/components/common/error-state";

type Props = {
  message: string;
};

export function DocumentsLoadError({ message }: Props) {
  return (
    <ErrorState
      title="Couldn't load your documents"
      description={message}
      onRetry={() => window.location.reload()}
      retryLabel="Refresh page"
      className="py-8"
    />
  );
}
