"use client";

import { ArrowRight, Shield, ShieldCheck, Users } from "lucide-react";

import { Button } from "@/components/common/button";
import { navigateToLogin } from "@/lib/landing/navigate-to-login";

const PEOPLE = [
  {
    title: "Employee",
    description: "Everything you need for your everyday work.",
  },
  {
    title: "Manager",
    description: "Clear visibility into your team's activities and requests.",
  },
  {
    title: "HR",
    description: "Centralized tools to manage people and workplace processes.",
  },
] as const;

const SECURITY = [
  {
    title: "Secure Access",
    description: "Authentication designed to protect employee accounts.",
    icon: ShieldCheck,
  },
  {
    title: "Role-Based Access",
    description: "Employees, managers and HR see information relevant to their role.",
    icon: Users,
  },
  {
    title: "Centralized Information",
    description: "Workplace information stays organized in one controlled platform.",
    icon: Shield,
  },
] as const;

export function LandingPeopleSection() {
  return (
    <section className="landing-section" aria-labelledby="landing-people-heading">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="landing-people-heading" className="landing-section-title">
            Built around people.
          </h2>
          <p className="landing-section-copy">
            The right tools for every part of your workplace.
          </p>
        </div>

        <ul className="landing-people-grid">
          {PEOPLE.map((item, index) => (
            <li
              key={item.title}
              className="landing-people-card landing-animate-up"
              style={{ animationDelay: `${0.08 + index * 0.08}s` }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-600 dark:text-sky-300">
                {item.title}
              </p>
              <p className="mt-3 text-base leading-relaxed text-foreground/90">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
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
            Your workplace. Protected.
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
                <div className="landing-feature-icon">
                  <Icon className="size-5" strokeWidth={2.2} />
                </div>
                <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
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
      <div className="landing-final-cta-inner mx-auto max-w-3xl px-5 py-16 text-center sm:px-8 lg:px-10">
        <h2 id="landing-final-heading" className="landing-section-title">
          Your workplace starts here.
        </h2>
        <p className="landing-section-copy mx-auto mt-4 max-w-xl">
          Everything you need is just one sign-in away.
        </p>
        <Button
          type="button"
          onClick={navigateToLogin}
          className="landing-cta mt-8 h-12 rounded-full px-8 text-sm font-semibold"
        >
          Enter HRMS
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer id="help" className="landing-footer border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <div>
          <p className="text-sm font-semibold text-foreground">iFranchise HRMS</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Internal workplace platform for employees, managers and HR teams.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Need help? Contact your HR administrator or IT support team.
        </p>
      </div>
    </footer>
  );
}
