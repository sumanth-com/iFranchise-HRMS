import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getWhatsNewUpdate } from "@/config/whats-new-updates";
import { LandingFooter } from "@/components/landing/landing-cta-footer";
import { PublicNavbar } from "@/components/landing/public-navbar";
import { WHATS_NEW_ROUTE } from "@/lib/auth/constants";
import { cn } from "@/lib/utils";

type WhatsNewDetailContentProps = {
  slug: string;
};

export function WhatsNewDetailContent({ slug }: WhatsNewDetailContentProps) {
  const update = getWhatsNewUpdate(slug);
  if (!update) notFound();

  return (
    <div className="landing-page min-h-screen">
      <div className="landing-ambient landing-ambient--subtle" aria-hidden />
      <PublicNavbar />

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:px-10">
        <Link
          href={WHATS_NEW_ROUTE}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to What&apos;s New
        </Link>

        <article className="landing-update-detail landing-animate-up mt-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {update.date}
            </p>
            {update.badge ? (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                  update.badge === "new" && "bg-sky-500/15 text-sky-700 dark:text-sky-200",
                )}
              >
                {update.badge}
              </span>
            ) : null}
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600 dark:text-sky-300">
              {update.category}
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {update.title}
          </h1>

          {update.summary ? (
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {update.summary}
            </p>
          ) : (
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {update.description}
            </p>
          )}

          {update.improvements?.length ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-foreground">Improvements</h2>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
                {update.improvements.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden className="text-sky-500">
                      •
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {update.notes?.length ? (
            <section className="mt-10 rounded-2xl border border-border/70 bg-muted/20 p-5">
              <h2 className="text-sm font-semibold text-foreground">Important notes</h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                {update.notes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>
      </main>

      <LandingFooter />
    </div>
  );
}
