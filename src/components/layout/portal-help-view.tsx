"use client";

import { AppNavLink as Link } from "@/components/layout/app-nav-link";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Headset,
  KeyRound,
  Mail,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { PortalManualCard } from "@/components/layout/portal-manual-card";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";
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
  accountant: {
    badge: "Accountant Portal Help",
    title: "How can we help?",
    description:
      "Quick answers for the Finance Dashboard, Team Payroll, reports, and your self-service tools.",
    settingsHref: ACCOUNTANT_ROUTES.settings,
    steps: [
      {
        title: "Open Finance Dashboard",
        detail:
          "Use Administration → Finance Dashboard for period KPIs, pending actions, and payroll overview.",
      },
      {
        title: "Work in Team Payroll",
        detail:
          "Open Administration → Team Payroll for runs, salary structure, reimbursements, payslips, and employee accounts.",
      },
      {
        title: "Export finance reports",
        detail: "Open Administration → Reports for payroll exports where permitted.",
      },
    ],
    faqs: [
      {
        q: "Can I approve leave or hire employees?",
        a: "No. The Accountant Portal is finance-focused. HR owns hiring, provisioning, and leave approvals.",
      },
      {
        q: "Can I change salary structures?",
        a: "Salary records are read-only for accounting. Structure edits stay with HR unless you are granted explicit edit permissions.",
      },
      {
        q: "Where do I see my own leave and attendance?",
        a: "Use Self-service in the Accountant sidebar, or switch to the Employee Portal.",
      },
      {
        q: "How do I reset my password?",
        a: "Settings → Account & security → Reset password (max 3 emails per day).",
      },
      {
        q: "Who do I contact for help?",
        a: `Email ${HR_EMAIL} for payroll access, documents, or account issues.`,
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
  if (variant === "employee") {
    return <EmployeeHelpSupport />;
  }

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

const EMPLOYEE_HELP_TOPICS = [
  { name: "General", icon: CircleHelp },
  { name: "Attendance & Leave", icon: CalendarDays },
  { name: "Payroll", icon: Wallet },
  { name: "Reimbursements", icon: FileText },
  { name: "Documents", icon: BookOpen },
  { name: "Account & Settings", icon: KeyRound },
] as const;

const EMPLOYEE_HELP_FAQS: Record<string, HelpFaq[]> = {
  General: [
    { q: "How do I mark my attendance?", a: "Open Attendance & Leave and use Check In when you start work. Use Check Out when your workday ends." },
    { q: "How do I update my profile information?", a: "You can update your gender, address, city, state, country, and postal code from My Profile. Contact HR to change other information." },
    { q: "Where can I see my notifications?", a: "Open Notifications from the sidebar to review, search, and manage messages for your account." },
    { q: "Who do I contact for help?", a: `Email ${HR_EMAIL} during support hours, Monday to Friday, 10:00 AM to 7:00 PM.` },
  ],
  "Attendance & Leave": [
    { q: "How do I mark my attendance?", a: "Open Attendance & Leave and use Check In when you start work. Use Check Out when your workday ends." },
    { q: "How do I apply for leave?", a: "Open Attendance & Leave, choose Apply Leave, select the leave type and dates, add a reason, then submit your request for HR review." },
    { q: "Where can I see my leave balance?", a: "Your Casual Leave, Earned Leave, and Optional Holiday balances appear at the top of Attendance & Leave." },
    { q: "How do I check my attendance history?", a: "Use the month controls above the calendar, then open Attendance History below it to view daily check-in and working hour details." },
    { q: "How can I track a leave request?", a: "Choose Leave History below the calendar to see your submitted requests and their approval status." },
  ],
  Payroll: [
    { q: "How can I view my payroll details?", a: "Open Payroll to see your salary summary, payment timeline, payslip history, bonuses, and bank details." },
    { q: "Where can I download a payslip?", a: "Open Payroll and select a published payslip from your history." },
    { q: "Why can’t I see the latest payslip?", a: "A payslip appears after HR publishes it. Contact HR if a published payslip is missing." },
    { q: "How can I update my bank details?", a: "Contact HR to request a bank detail update and provide any required supporting documents." },
  ],
  Reimbursements: [
    { q: "How do I submit a reimbursement request?", a: "Open Reimbursements, complete the claim form, attach receipts, and submit it for HR review." },
    { q: "How can I track my claim?", a: "Your reimbursement history shows each claim’s status and any HR remarks." },
    { q: "What files can I attach?", a: "Attach receipt images or PDFs. The form shows file size and count limits before submission." },
    { q: "How do I correct a submitted claim?", a: `Contact ${HR_EMAIL} and include the claim date and amount so HR can help.` },
  ],
  Documents: [
    { q: "Where can I find my documents?", a: "Open Documents to view files shared with you. Select a document to preview or download it." },
    { q: "How do I download a document?", a: "Open the document card and choose Download. Some files may open in a preview first." },
    { q: "Why can’t I see a document I expected?", a: `Ask HR at ${HR_EMAIL} to confirm the document has been shared with your account.` },
    { q: "Can I replace an uploaded document?", a: "If replacement is enabled for that document, open its actions menu and choose Replace. Otherwise contact HR." },
  ],
  "Account & Settings": [
    { q: "How do I reset my password?", a: "Select Reset password on My Profile and confirm. A reset link will be sent to your company email." },
    { q: "Who should I contact to change other profile details?", a: `Email ${HR_EMAIL} for help changing employment or other profile information.` },
    { q: "How do I change notification preferences?", a: "Open Settings to manage notification delivery and appearance preferences." },
    { q: "Why did I not receive a password reset link?", a: "Check your company inbox and spam folder. Password reset requests are limited to three per day." },
  ],
};

function EmployeeHelpSupport() {
  const [activeTopic, setActiveTopic] = useState<string>("General");
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const faqs = EMPLOYEE_HELP_FAQS[activeTopic] ?? [];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:px-6 lg:px-8">
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col gap-4">
        <section id="help-topics" className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border bg-card shadow-sm md:grid-cols-[15rem_minmax(0,1fr)]">
          <nav className="border-b bg-muted/10 p-4 md:border-b-0 md:border-r" aria-label="Help topics">
            <h1 className="mb-3 text-lg font-semibold text-muted-foreground">Help Topics</h1>
            <div className="space-y-1">
              {EMPLOYEE_HELP_TOPICS.map(({ name, icon: Icon }) => (
                <button key={name} type="button" onClick={() => { setActiveTopic(name); setOpenQuestion(null); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${activeTopic === name ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white" : "text-foreground hover:bg-muted"}`}>
                  <Icon className="size-4 shrink-0" aria-hidden />{name}
                </button>
              ))}
            </div>
          </nav>
          <div className="flex min-h-0 min-w-0 flex-col p-4 md:p-5">
            <h2 className="mb-4 shrink-0 text-lg font-semibold text-muted-foreground">Frequently Asked Questions</h2>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {faqs.map((faq, index) => {
                const key = `${activeTopic}-${index}`;
                const isOpen = openQuestion === key || (openQuestion === null && index === 0);
                return (
                  <article key={key} className="overflow-hidden rounded-xl border bg-background">
                    <button type="button" aria-expanded={isOpen} onClick={() => setOpenQuestion(isOpen ? "" : key)} className="flex w-full min-h-12 items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold">
                      <span>{faq.q}</span>
                      <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                    </button>
                    {isOpen ? <p className="mx-3 mb-3 rounded-lg bg-violet-500/[0.06] px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">{faq.a}</p> : null}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border bg-card px-5 py-3 text-center shadow-sm">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <span className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700"><Headset className="size-5" aria-hidden /></span>
            Still need help?
          </div>
          <a href={`mailto:${HR_EMAIL}`} className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted/50">
            <Mail className="size-4 text-violet-700" aria-hidden />{HR_EMAIL}
          </a>
          <div className="inline-flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
            <Clock3 className="size-4 text-violet-700" aria-hidden />Mon – Fri, 10:00 AM – 7:00 PM
          </div>
        </footer>
      </div>
    </div>
  );
}
