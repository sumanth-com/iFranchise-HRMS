import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";
import { buttonVariants } from "@/components/common/button";
import { PageScroll } from "@/components/common/sticky-layout";
import { cn } from "@/lib/utils";

export default function UnauthorizedPage() {
  return (
    <PageScroll className="flex flex-col">
      <div className="flex min-h-full flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-indigo-50 text-[#5f55ee] dark:bg-indigo-500/15 dark:text-indigo-300">
          <ShieldCheck className="size-8" strokeWidth={2} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Access not available
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Your account does not currently have access to this portal. Contact HR
            if you believe this is an error.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href={HR_PORTAL_HOME} className={cn(buttonVariants({ variant: "default" }))}>
            Go to dashboard
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Sign in with another account
          </Link>
        </div>
      </div>
    </PageScroll>
  );
}
