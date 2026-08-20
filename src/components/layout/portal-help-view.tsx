"use client";

import { AppNavLink as Link } from "@/components/layout/app-nav-link";
import { CircleHelp, KeyRound, Mail } from "lucide-react";

import { PortalManualCard } from "@/components/layout/portal-manual-card";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { PORTAL_MANUALS } from "@/lib/help/portal-manuals";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import type { PortalVariant } from "@/providers/auth-provider";

const HR_EMAIL = "hr@ifranchise.in";

type HelpFaq = {
  q: string;
  a: string;
};

type HelpStep = {
  title: string;
  detail: string;
};

type PortalHelpConfig = {
  badge: string;
  title: string;
  description: string;
  steps: HelpStep[];
  faqs: HelpFaq[];
  settingsHref: string;
};

const PORTAL_HELP: Record<PortalVariant, PortalHelpConfig> = {
  employee: {
    badge: "Employee Portal Help",
    title: "How can we help?",
    description:
      "Quick answers for attendance, leave, payslips, documents, and account security.",
    settingsHref: EMPLOYEE_ROUTES.settings,
    steps: [
      {
        title: "Mark attendance",
        detail: "Open Attendance from Self-service, then check in when you start work.",
      },
      {
        title: "Request leave",
        detail: "Open Leave → Apply Leave, pick dates and type, then submit for approval.",
      },
      {
        title: "Find payslips",
        detail: "Open Payroll after HR publishes the month, then download from history.",
      },
    ],
    faqs: [
      {
        q: "How do I change my password?",
        a: "Open Settings → Account & security → Reset password. You can request up to 3 reset emails per day.",
      },
      {
        q: "Where is my payslip?",
        a: "Open Payroll after HR publishes the month, then download from history.",
      },
      {
        q: "How do I apply for leave?",
        a: "Open Leave → Apply Leave, choose dates and type, then submit for approval.",
      },
      {
        q: "Can I edit my profile?",
        a: "Yes — open My Profile to update phone, emergency contact, and allowed preferences.",
      },
      {
        q: "Who do I contact for help?",
        a: `Email ${HR_EMAIL} for payroll, documents, assets, or account issues.`,
      },
      {
        q: "Why can’t I request another password reset?",
        a: "Password reset is limited to 3 requests per day. Try again tomorrow or contact HR.",
      },
      {
        q: "Where can I learn every module?",
        a: "Open Portal manual on this Help page, pick a module, and read what it is, why it helps, and what’s inside — no extra links.",
      },
    ],
  },
  hr: {
    badge: "HR Portal Help",
    title: "How can we help?",
    description:
      "Quick answers for HR operations, provisioning, leave vs team leave, and account security.",
    settingsHref: "/dashboard/settings",
    steps: [
      {
        title: "Add or invite people",
        detail:
          "Create an employee, open their profile, then use Account provisioning to send invites.",
      },
      {
        title: "Approve team leave",
        detail:
          "Use Team Leave under Administration for org-wide requests. My Leave is only your personal leave.",
      },
      {
        title: "Secure your account",
        detail:
          "Open Settings → Account & security → Reset password if you need a new login link.",
      },
    ],
    faqs: [
      {
        q: "How do I reset my password?",
        a: "Open Settings → Account & security → Reset password. Limited to 3 emails per day.",
      },
      {
        q: "Where do I invite employees?",
        a: "Employees → open a profile → Account provisioning to send or resend invites.",
      },
      {
        q: "Team Leave vs My Leave?",
        a: "My Leave is personal. Team Leave under Administration is for org-wide HR leave work.",
      },
      {
        q: "Who can change company settings?",
        a: "Users with company settings access (typically Super Admin / HR admins).",
      },
      {
        q: "Self-service vs Administration?",
        a: "Self-service is your personal workspace. Administration is for company-wide HR operations.",
      },
      {
        q: "Why can’t I request another password reset?",
        a: "Password reset is limited to 3 requests per day. Try again tomorrow or contact HR.",
      },
      {
        q: "Where can I learn every module?",
        a: "Open Portal manual on this Help page, pick a module, and read what it is, why it helps, and what’s inside — no extra links.",
      },
    ],
  },
  manager: {
    badge: "Manager Portal Help",
    title: "How can we help?",
    description:
      "Quick answers for team visibility, leave, performance, and account security.",
    settingsHref: MANAGER_ROUTES.settings,
    steps: [
      {
        title: "Review your team",
        detail: "Open Teammates to see people in your reporting line and their profiles.",
      },
      {
        title: "Check presence and leave",
        detail: "Use Team Attendance and Team Leave for today’s status and planned absences.",
      },
      {
        title: "Your own self-service",
        detail: "Attendance, Leave, and Payroll under Self-service are still for you personally.",
      },
    ],
    faqs: [
      {
        q: "How do I see my team's leave?",
        a: "Open Team Leave under Administration for people in your reporting hierarchy.",
      },
      {
        q: "How do I view teammates?",
        a: "Open Teammates to review members, profiles, and reporting structure.",
      },
      {
        q: "How do I reset my password?",
        a: "Settings → Account & security → Reset password (up to 3 emails per day).",
      },
      {
        q: "Where is my own leave?",
        a: "Use Leave under Self-service for your personal balance and requests.",
      },
      {
        q: "Who do I contact for help?",
        a: `Email ${HR_EMAIL} for payroll, access, or account issues.`,
      },
      {
        q: "Why can’t I request another password reset?",
        a: "Password reset is limited to 3 requests per day. Try again tomorrow or contact HR.",
      },
      {
        q: "Where can I learn every module?",
        a: "Open Portal manual on this Help page, pick a module, and read what it is, why it helps, and what’s inside — no extra links.",
      },
    ],
  },
  ceo: {
    badge: "Executive Portal Help",
    title: "How can we help?",
    description:
      "Quick answers for approvals, provisioning, reporting, and account security.",
    settingsHref: CEO_ROUTES.settings,
    steps: [
      {
        title: "Clear approvals",
        detail: "Start with Approvals for items that need an executive decision.",
      },
      {
        title: "Invite executive users",
        detail:
          "Use User Provisioning for portal invites. Employee master data stays with HR.",
      },
      {
        title: "Review the organization",
        detail: "Use Organization, Reports, and Analytics for leadership oversight.",
      },
    ],
    faqs: [
      {
        q: "How do I invite executive users?",
        a: "Open User Provisioning → Invite User. Employee master data stays with HR.",
      },
      {
        q: "Where are pending approvals?",
        a: "Open Approvals from the sidebar under Administration.",
      },
      {
        q: "How do I reset my password?",
        a: "Settings → Account & security → Reset password (max 3 emails per day).",
      },
      {
        q: "Can I edit employee records here?",
        a: "No — this portal is for monitoring and approvals. HR owns employee edits.",
      },
      {
        q: "Who do I contact for help?",
        a: `Email ${HR_EMAIL} for access, documents, or account issues.`,
      },
      {
        q: "Why can’t I request another password reset?",
        a: "Password reset is limited to 3 requests per day. Try again tomorrow or contact HR.",
      },
      {
        q: "Where can I learn every module?",
        a: "Open Portal manual on this Help page, pick a module, and read what it is, why it helps, and what’s inside — no extra links.",
      },
    ],
  },
};

export function PortalHelpView({
  firstName,
  variant,
}: {
  firstName: string;
  variant: PortalVariant;
}) {
  const config = PORTAL_HELP[variant];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-6xl min-h-0 flex-col px-5 py-4 md:px-8 md:py-5">
        <header className="shrink-0 border-b pb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {config.badge}
          </p>
          <div className="mt-1.5 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 max-w-3xl">
              <h1 className="text-2xl font-semibold tracking-tight md:text-[1.65rem]">
                Hi {firstName} — {config.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
            </div>
            <a
              href={`mailto:${HR_EMAIL}`}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              <Mail className="size-3.5" />
              {HR_EMAIL}
            </a>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-8 overflow-hidden pt-5 lg:grid-cols-2 lg:items-stretch lg:gap-10">
          <section className="flex min-h-0 flex-col overflow-hidden">
            <h2 className="mb-3 shrink-0 text-sm font-semibold tracking-tight">
              Getting started
            </h2>
            <ol className="shrink-0 space-y-4">
              {config.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{step.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex min-h-0 flex-1">
              <PortalManualCard {...PORTAL_MANUALS[variant]} />
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden">
            <div className="mb-3 flex shrink-0 items-center gap-2">
              <CircleHelp className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold tracking-tight">Common questions</h2>
            </div>
            <dl className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {config.faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <dt className="text-sm font-medium leading-snug">{faq.q}</dt>
                  <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {faq.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <footer className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
          <p>
            Password reset is limited to{" "}
            <span className="font-medium text-foreground">3 requests per day</span>.
          </p>
          <div className="flex items-center gap-4">
            <a
              href={`mailto:${HR_EMAIL}`}
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
            >
              <Mail className="size-3.5" />
              Contact HR
            </a>
            <Link
              href={config.settingsHref}
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
            >
              <KeyRound className="size-3.5" />
              Account settings
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
