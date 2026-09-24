"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { ErrorState } from "@/components/common/error-state";
import {
  PAGE_LOAD_ERROR_DESCRIPTION,
  PAGE_LOAD_ERROR_TITLE,
  SECTION_LOAD_ERROR_DESCRIPTION,
  SECTION_LOAD_ERROR_TITLE,
  SECTION_LOAD_RETRY_LABEL,
} from "@/lib/errors/employee-facing";

type SoftLoadErrorProps = {
  /** Prefer page-level wording when the whole module failed to load. */
  variant?: "section" | "page";
  className?: string;
};

/**
 * In-shell recovery UI for soft-failed page/module loaders.
 * Retries via router.refresh() without remounting the portal chrome.
 */
export function SoftLoadError({
  variant = "section",
  className,
}: SoftLoadErrorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className={className ?? "flex min-h-[40vh] flex-1 items-center justify-center p-6"}>
      <ErrorState
        title={variant === "page" ? PAGE_LOAD_ERROR_TITLE : SECTION_LOAD_ERROR_TITLE}
        description={
          variant === "page" ? PAGE_LOAD_ERROR_DESCRIPTION : SECTION_LOAD_ERROR_DESCRIPTION
        }
        retryLabel={isPending ? "Retrying…" : SECTION_LOAD_RETRY_LABEL}
        onRetry={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
      />
    </div>
  );
}
