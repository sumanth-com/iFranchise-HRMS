"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import brandLogo from "@/assets/Logo.png";
import { PUBLIC_LANDING_ROUTE, WHATS_NEW_ROUTE } from "@/lib/auth/constants";
import { navigateToLogin } from "@/lib/landing/navigate-to-login";

const NAV_LINKS = [
  { href: `${PUBLIC_LANDING_ROUTE}#features`, label: "Features" },
  { href: `${PUBLIC_LANDING_ROUTE}#security`, label: "Security" },
  { href: WHATS_NEW_ROUTE, label: "What's new" },
] as const;

type PublicNavbarProps = {
  compact?: boolean;
};

function NavbarChrome({ compact = false }: PublicNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="landing-nav">
      <div className="landing-nav-inner">
        <Link href={PUBLIC_LANDING_ROUTE} className="landing-nav-brand">
          <span className="landing-brand-mark relative flex size-9 shrink-0 overflow-hidden rounded-xl">
            <Image
              src={brandLogo}
              alt="iFranchise"
              width={36}
              height={36}
              className="size-full object-contain"
              priority={!compact}
            />
          </span>
          <span className="landing-nav-brand-text">iFranchise</span>
        </Link>

        {!compact ? (
          <nav className="landing-nav-links" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="landing-nav-link">
                {link.label}
              </Link>
            ))}
          </nav>
        ) : (
          <span className="landing-nav-center-spacer" aria-hidden />
        )}

        <div className="landing-nav-actions">
          <button
            type="button"
            onClick={navigateToLogin}
            className={
              compact
                ? "landing-nav-signin landing-nav-signin--outline"
                : "landing-nav-signin hidden sm:inline-flex"
            }
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
              aria-label="Open menu"
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
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigateToLogin();
                  }}
                  className="landing-nav-signin mt-2 w-full"
                >
                  Sign In
                  <ArrowRight className="size-4" aria-hidden />
                </button>
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
