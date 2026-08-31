import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/common/button";
import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";

export function AppRouteNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileQuestion className="size-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">
          We couldn&apos;t find this page
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page may have moved or the information is no longer available.
        </p>
        <div className="mt-6 flex justify-center">
          <Button nativeButton={false} render={<Link href={HR_PORTAL_HOME} />}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
