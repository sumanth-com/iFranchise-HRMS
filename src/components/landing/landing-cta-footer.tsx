"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Database,
  EyeOff,
  FileLock2,
  LockKeyhole,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import brandLogo from "@/assets/Logo.png";
import { LandingPeopleBento } from "@/components/landing/landing-people-bento";
import { Button } from "@/components/common/button";
import { LEGAL_FOOTER_LINKS } from "@/lib/landing/legal-content";
import { PUBLIC_LANDING_ROUTE } from "@/lib/auth/constants";
import { navigateToLogin } from "@/lib/landing/navigate-to-login";

const SECURITY = [
  {
    title: "Secure Access",
    description: "Authentication designed to protect employee accounts and sessions.",
    icon: LockKeyhole,
  },
  {
    title: "Role-Based Access",
    description: "Employees, managers and HR see only what their role needs.",
    icon: UserCog,
  },
  {
    title: "Centralized Information",
    description: "Workplace data stays organized in one controlled platform.",
    icon: ShieldCheck,
  },
  {
    title: "Data Privacy",
    description: "Sensitive employee records stay protected with controlled visibility.",
    icon: EyeOff,
  },
  {
    title: "Audit-Ready Records",
    description: "Track key workplace actions with clear, organized activity history.",
    icon: FileLock2,
  },
  {
    title: "Reliable Storage",
    description: "Documents and payroll data stay securely stored and easy to find.",
    icon: Database,
  },
] as const;

export function LandingPeopleSection() {
  return (
    <section className="landing-section landing-people" aria-labelledby="landing-people-heading">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="landing-people-heading" className="landing-section-title">
            Built around <span className="landing-section-title-accent">people.</span>
          </h2>
          <p className="landing-section-copy">
            The right tools for every part of your workplace.
          </p>
        </div>

        <LandingPeopleBento />
      </div>
    </section>
  );
}

export function LandingSecuritySection() {
  return (
    <section
      id="security"
      className="landing-section landing-security"
      aria-labelledby="landing-security-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="landing-security-heading" className="landing-section-title">
            Your workplace.{" "}
            <span className="landing-section-title-accent">Protected.</span>
          </h2>
          <p className="landing-section-copy">
            Secure access and controlled permissions keep workplace information
            where it belongs.
          </p>
        </div>

        <ul className="landing-security-grid">
          {SECURITY.map((item, index) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className="landing-security-item landing-animate-up"
                style={{ animationDelay: `${0.08 + index * 0.08}s` }}
              >
                <div className="landing-security-icon">
                  <Icon className="size-5" strokeWidth={2.15} />
                </div>
                <div className="landing-security-copy">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function LandingFinalCta() {
  return (
    <section className="landing-section landing-final-cta" aria-labelledby="landing-final-heading">
      <div className="landing-final-cta-shell mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        <div className="landing-final-cta-inner">
          <h2 id="landing-final-heading" className="landing-section-title">
            Your workplace starts{" "}
            <span className="landing-section-title-accent">here.</span>
          </h2>
          <p className="landing-section-copy landing-final-cta-copy">
            Everything you need is just one sign-in away.
          </p>
          <Button
            type="button"
            onClick={navigateToLogin}
            className="landing-cta landing-final-cta-button h-12 rounded-full px-8 text-sm font-semibold"
          >
            Enter HRMS
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <Link href={PUBLIC_LANDING_ROUTE} className="landing-footer-brand">
          <span className="landing-footer-brand-mark">
            <Image
              src={brandLogo}
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-lg object-contain"
            />
          </span>
          <span className="landing-footer-brand-inline">iFranchise</span>
        </Link>

        <p className="landing-footer-copy">
          © {year} iFranchise. All rights reserved.
        </p>

        <nav className="landing-footer-links" aria-label="Legal">
          {LEGAL_FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="landing-footer-link">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
