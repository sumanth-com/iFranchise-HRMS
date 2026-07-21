"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarCheck,
  CircleHelp,
  ClipboardList,
  KeyRound,
  Mail,
  UserRound,
  Users,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import type { PortalVariant } from "@/providers/auth-provider";

const HR_EMAIL = "hr@ifranchise.in";

type QuickAction = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type HelpFaq = {
  q: string;
  a: string;
};

type PortalHelpConfig = {
  badge: string;
  title: string;
  description: string;
  quickActions: QuickAction[];
  faqs: HelpFaq[];
};

const PORTAL_HELP: Record<PortalVariant, PortalHelpConfig> = {
  employee: {
    badge: "Employee Help",
    title: "quick help",
    description: "Short answers for everyday work. Use the left sidebar to open any module.",
    quickActions: [
      { label: "Check in / out", href: EMPLOYEE_ROUTES.attendance, icon: CalendarCheck },
      { label: "Apply leave", href: EMPLOYEE_ROUTES.leave, icon: ClipboardList },
      { label: "My payslip", href: EMPLOYEE_ROUTES.payroll, icon: BarChart3 },
      { label: "Reset password", href: EMPLOYEE_ROUTES.settings, icon: KeyRound },
    ],
    faqs: [
      {
        q: "How do I change my password?",
        a: "Open Settings → Account & security → Reset password. We email you a secure link.",
      },
      {
        q: "Where is my payslip?",
        a: "Open Payroll after HR publishes the month, then download from history.",
      },
      {
        q: "How do I apply for leave?",
        a: "Open Leave → Apply Leave, pick dates and type, then submit.",
      },
    ],
  },
  hr: {
    badge: "HR Portal Help",
    title: "quick help",
    description: "Guidance for HR operations, your account, and everyday portal tasks.",
    quickActions: [
      { label: "Employees", href: "/dashboard/employees", icon: Users },
      { label: "Attendance", href: "/dashboard/attendance-management", icon: CalendarCheck },
      { label: "Leave", href: "/dashboard/leave-management", icon: ClipboardList },
      { label: "Reset password", href: "/dashboard/settings", icon: KeyRound },
    ],
    faqs: [
      {
        q: "How do I reset my password?",
        a: "Open Settings from Help quick actions → Account & security → Reset password.",
      },
      {
        q: "Where do I invite employees?",
        a: "Go to Employees → open an employee profile → use Account provisioning to send invites.",
      },
      {
        q: "Who can change company settings?",
        a: "Super Admin users can open Company Settings from the sidebar under Administration.",
      },
    ],
  },
  manager: {
    badge: "Manager Help",
    title: "quick help",
    description: "Quick answers for team management, attendance, and your account.",
    quickActions: [
      { label: "My team", href: MANAGER_ROUTES.team, icon: Users },
      { label: "Team attendance", href: MANAGER_ROUTES.attendanceTeam, icon: CalendarCheck },
      { label: "Leave approvals", href: MANAGER_ROUTES.leave, icon: ClipboardList },
      { label: "Reset password", href: MANAGER_ROUTES.settings, icon: KeyRound },
    ],
    faqs: [
      {
        q: "How do I approve leave?",
        a: "Open Leave from the sidebar, review pending requests, and approve or reject.",
      },
      {
        q: "How do I view my team?",
        a: "Open Team to see members, profiles, and reporting structure.",
      },
      {
        q: "How do I reset my password?",
        a: "Open Settings → Account & security → Reset password.",
      },
    ],
  },
  ceo: {
    badge: "Executive Help",
    title: "quick help",
    description: "Guidance for executive workflows, approvals, and your account.",
    quickActions: [
      { label: "Approvals", href: CEO_ROUTES.approvals, icon: ClipboardList },
      { label: "User provisioning", href: CEO_ROUTES.userProvisioning, icon: UserRound },
      { label: "Reports", href: CEO_ROUTES.reports, icon: BarChart3 },
      { label: "Reset password", href: CEO_ROUTES.profile, icon: KeyRound },
    ],
    faqs: [
      {
        q: "How do I invite executive users?",
        a: "Open User Provisioning → Invite User. Employees are managed by HR.",
      },
      {
        q: "Where are pending approvals?",
        a: "Open Approvals from the sidebar or use the quick action above.",
      },
      {
        q: "How do I reset my password?",
        a: "Open Profile → Account & security → Reset password.",
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="rounded-2xl border bg-gradient-to-br from-sky-500/10 via-card to-violet-500/10 px-5 py-4 shadow-sm">
          <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            <CircleHelp className="size-3.5 text-sky-600" />
            {config.badge}
          </div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Hi {firstName}, {config.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {config.quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.label}
                variant="outline"
                className="h-auto justify-start gap-3 px-3 py-2.5"
                nativeButton={false}
                render={<Link href={item.href} />}
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </Button>
            );
          })}
        </div>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold tracking-tight">Common questions</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {config.faqs.map((faq) => (
              <div key={faq.q} className="rounded-lg border bg-muted/20 px-3 py-2.5">
                <p className="text-sm font-medium">{faq.q}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold">Need more support?</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            For payroll, documents, assets, or account help, contact HR.
          </p>
          <a
            href={`mailto:${HR_EMAIL}`}
            className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:underline dark:text-sky-400"
          >
            <Mail className="size-3.5" />
            {HR_EMAIL}
          </a>
        </section>
      </div>
    </div>
  );
}
