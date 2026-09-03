"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import brandLogo from "@/assets/Logo.png";
import { LandingCtaContext } from "@/components/landing/landing-cta-provider";
import { PUBLIC_LANDING_ROUTE, WHATS_NEW_ROUTE } from "@/lib/auth/constants";
import { navigateToLogin } from "@/lib/landing/navigate-to-login";
import { cn } from "@/lib/utils";

/**
 * `section` links to an element on the landing page and highlights while that
 * section is in view. `match` highlights on an exact pathname instead. No link is
 * highlighted while the hero is in view.
 */
const NAV_LINKS = [
  { href: `${PUBLIC_LANDING_ROUTE}#features`, label: "Features", section: "features" },
  { href: `${PUBLIC_LANDING_ROUTE}#people`, label: "Roles", section: "people" },
  { href: `${PUBLIC_LANDING_ROUTE}#security`, label: "Security", section: "security" },
  { href: WHATS_NEW_ROUTE, label: "What's new", match: WHATS_NEW_ROUTE },
] as const;

/** Observed in document order, so the topmost visible one wins. */
const SPY_SECTION_IDS = ["features", "people", "security"] as const;

type PublicNavbarProps = {
  compact?: boolean;
};

function NavbarChrome({ compact = false }: PublicNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const pathname = usePathname();
  const isLandingRoute = pathname === PUBLIC_LANDING_ROUTE;
  const landingCta = useContext(LandingCtaContext);
  const handleCta = landingCta?.handleLandingCta ?? navigateToLogin;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 72);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (compact || !isLandingRoute) {
      setActiveSection(null);
      return;
    }

    const elements = SPY_SECTION_IDS.map((id) =>
      document.getElementById(id),
    ).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActiveSection(
          SPY_SECTION_IDS.find((id) => visible.has(id)) ?? null,
        );
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [compact, isLandingRoute]);

  return (
    <header className={cn("landing-nav", scrolled && "landing-nav--scrolled")}>
      <div className="landing-nav-inner">
        <Link href={PUBLIC_LANDING_ROUTE} className="landing-nav-brand">
          <span className="landing-brand-mark relative flex size-11 shrink-0 overflow-hidden rounded-xl">
            <Image
              src={brandLogo}
              alt="iFranchise"
              width={44}
              height={44}
              className="size-full object-contain"
              priority={!compact}
            />
          </span>
          <span className="landing-nav-brand-text">iFranchise</span>
        </Link>

        {!compact ? (
          <nav className="landing-nav-links" aria-label="Primary">
            {NAV_LINKS.map((link) => {
              const isActive =
                "section" in link
                  ? isLandingRoute && activeSection === link.section
                  : pathname === link.match;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "landing-nav-link",
                    isActive && "landing-nav-link--active",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        ) : (
          <span className="landing-nav-center-spacer" aria-hidden />
        )}

        <div className="landing-nav-actions">
          <button
            type="button"
            onClick={handleCta}
            className={cn(
              "landing-nav-signin",
              compact
                ? "landing-nav-signin--outline"
                : "landing-nav-cta landing-nav-cta--from-tablet",
            )}
          >
            Sign In
            {!compact ? <ArrowRight className="size-3.5" aria-hidden /> : null}
          </button>

          {!compact ? (
            <button
              type="button"
              className="landing-nav-menu-btn"
              aria-expanded={menuOpen}
              aria-controls="public-mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="sr-only">Menu</span>
              <span className="flex flex-col gap-1.5" aria-hidden>
                <span className="block h-0.5 w-4 rounded bg-foreground" />
                <span className="block h-0.5 w-4 rounded bg-foreground" />
              </span>
            </button>
          ) : null}

          {!compact && menuOpen ? (
            <div id="public-mobile-nav" className="landing-nav-mobile">
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function PublicNavbar() {
  return <NavbarChrome />;
}

export function PublicNavbarMinimal() {
  return <NavbarChrome compact />;
}
