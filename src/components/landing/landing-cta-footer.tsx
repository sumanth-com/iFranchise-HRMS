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
  User,
  UserCog,
  Users,
} from "lucide-react";

import brandLogo from "@/assets/Logo.png";
import { LandingPeopleBento } from "@/components/landing/landing-people-bento";
import { LandingSectionHeading } from "@/components/landing/landing-section-heading";
import { useLandingCta } from "@/components/landing/landing-cta-provider";
import { LEGAL_FOOTER_LINKS } from "@/lib/landing/legal-content";
import { PUBLIC_LANDING_ROUTE } from "@/lib/auth/constants";

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
    <section
      id="people"
      className="landing-section landing-people"
      aria-labelledby="landing-people-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        <LandingSectionHeading
          id="landing-people-heading"
          eyebrow="Every role covered"
          title={
            <>
              Built around <span className="landing-section-title-accent">people.</span>
            </>
          }
          subtitle="The right tools for every part of your workplace."
        />

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
        <LandingSectionHeading
          id="landing-security-heading"
          eyebrow="Security & access"
          title={
            <>
              Your workplace.{" "}
              <span className="landing-section-title-accent">Protected.</span>
            </>
          }
          subtitle="Secure access and controlled permissions keep workplace information where it belongs."
        />

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
  const { handleLandingCta, isMobileOrTablet } = useLandingCta();

  return (
    <section
      className="landing-final-cta-section relative overflow-hidden py-14 sm:py-20"
      aria-labelledby="landing-final-heading"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#170a4a] via-[#1c0d5a] to-[#124296] p-8 text-white shadow-2xl sm:p-12 lg:p-14">
          {/* Ambient Lighting */}
          <div
            className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-violet-600/30 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-blue-500/30 blur-3xl"
            aria-hidden
          />

          {/* Flowing background lines on right */}
          <svg
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-2/3 opacity-30"
            viewBox="0 0 600 400"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M100 400C250 300 350 200 600 250V400H100Z"
              fill="url(#ctaWaveGrad)"
            />
            <path
              d="M0 400C200 250 400 320 600 150"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1.5"
            />
            <path
              d="M50 400C220 280 380 340 600 200"
              stroke="rgba(147,197,253,0.3)"
              strokeWidth="1.5"
            />
            <path
              d="M120 400C280 310 420 300 600 120"
              stroke="rgba(196,181,253,0.25)"
              strokeWidth="1.5"
            />
            <defs>
              <linearGradient id="ctaWaveGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
              </linearGradient>
            </defs>
          </svg>

          <div className="landing-final-cta-grid relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
            {/* Left Column: Heading, Subtitle & Button */}
            <div className="landing-final-cta-copy-block lg:col-span-7">
              <h2
                id="landing-final-heading"
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.65rem] lg:leading-tight"
              >
                Your workplace starts here.
              </h2>
              <p className="landing-final-cta-copy-text mt-3 max-w-md text-sm text-slate-300 sm:text-base lg:max-w-none">
                {isMobileOrTablet
                  ? "Explore the platform, then continue on desktop for the full HRMS experience."
                  : "Everything you need is just one sign-in away."}
              </p>
              <div className="landing-final-cta-actions mt-7 flex sm:mt-8">
                <button
                  type="button"
                  onClick={handleLandingCta}
                  className="landing-hero-cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-8 text-sm font-bold text-white shadow-xl transition-all hover:scale-105 active:scale-95 sm:w-auto"
                >
                  <span>{isMobileOrTablet ? "Get Started" : "Enter HRMS"}</span>
                  <ArrowRight className="size-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Right Column: Glass Card UI with floating badge */}
            <div className="relative flex justify-center lg:col-span-5 lg:justify-end">
              <div className="relative w-full max-w-[340px] sm:max-w-[360px]">
                {/* Main Glass Card */}
                <div className="relative w-full rounded-3xl border border-white/20 bg-gradient-to-b from-white/15 to-white/5 p-4.5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5">
                  {/* Card Header Skeletons */}
                  <div className="flex items-center gap-2.5 pb-4">
                    <div className="size-6.5 rounded-full bg-white/25" />
                    <div className="h-3 w-28 rounded-full bg-white/25" />
                  </div>

                  {/* 3 Frosted List Items */}
                  <div className="flex flex-col gap-2.5">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/10 p-3 shadow-xs"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
                          <User className="size-4 text-white/80" />
                        </div>
                        <div className="flex flex-1 flex-col gap-1.5">
                          <div className="h-2.5 w-24 rounded-full bg-white/40" />
                          <div className="h-2 w-14 rounded-full bg-white/25" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Floating Frosted Icon Badge */}
                  <div className="absolute -right-5 top-1/2 flex size-18 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/30 bg-white/90 p-3 text-[#5f55ee] shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl dark:bg-white/95 sm:-right-8 sm:size-20 sm:rounded-3xl">
                    <Users className="size-8 sm:size-9" strokeWidth={2.2} />
                  </div>
                </div>
              </div>
            </div>
          </div>
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
