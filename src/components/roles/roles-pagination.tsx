"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/common/button";

type Props = {
  page: number;
  pageSize: number;
  total: number;
};

export function RolesPagination({ page, pageSize, total }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function goTo(nextPage: number) {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("page", String(nextPage));
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–
        {Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || isPending}
          onClick={() => goTo(page - 1)}
        >
          Previous
        </Button>
        <span className="flex items-center px-2">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || isPending}
          onClick={() => goTo(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
