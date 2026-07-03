import Link from "next/link";
import { ShieldX } from "lucide-react";

import { buttonVariants } from "@/components/common/button";
import { cn } from "@/lib/utils";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldX className="size-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">403 — Access denied</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          You do not have permission to view this page. Contact your HR
          administrator if you believe this is an error.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
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
  );
}
