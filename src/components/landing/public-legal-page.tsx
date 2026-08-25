import Link from "next/link";

import { LandingFooter } from "@/components/landing/landing-cta-footer";
import { PublicNavbar } from "@/components/landing/public-navbar";
import {
  LEGAL_FOOTER_LINKS,
  LEGAL_PAGES,
  LEGAL_ROUTES,
  type LegalPageSlug,
} from "@/lib/landing/legal-content";
import { cn } from "@/lib/utils";

type PublicLegalPageProps = {
  slug: LegalPageSlug;
};

export function PublicLegalPage({ slug }: PublicLegalPageProps) {
  const page = LEGAL_PAGES[slug];
  const activeHref = LEGAL_ROUTES[slug];

  return (
    <div className="landing-page landing-legal-page min-h-screen">
      <PublicNavbar />

      <div className="landing-legal-subnav">
        <div className="landing-legal-subnav-inner">
          <p className="landing-legal-subnav-label">Security &amp; Privacy</p>
          <nav className="landing-legal-subnav-links" aria-label="Legal pages">
            {LEGAL_FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "landing-legal-subnav-link",
                  link.href === activeHref && "is-active",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <header className="landing-legal-hero">
        <div className="landing-legal-hero-inner">
          <h1>{page.title}</h1>
          <p>Last updated on : {page.lastUpdated}</p>
        </div>
      </header>

      <main className="landing-legal-main">
        <div className="landing-legal-content landing-animate-up">
          <p className="landing-legal-intro">{page.intro}</p>

          <div className="landing-legal-sections">
            {page.sections.map((section) => (
              <section key={section.title} className="landing-legal-section">
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
