import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SettingsResignationLinkSectionProps = {
  href: string;
  title: string;
  description: string;
};

export function SettingsResignationLinkSection({
  href,
  title,
  description,
}: SettingsResignationLinkSectionProps) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
            <LogOut className="size-4 text-muted-foreground" />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Link
          href={href}
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          Open {title}
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
