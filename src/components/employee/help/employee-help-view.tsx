"use client";

import Link from "next/link";
import {
  CalendarCheck,
  CalendarDays,
  CircleHelp,
  Clock3,
  IdCard,
  KeyRound,
  Mail,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";

const HR_EMAIL = "hr@ifranchise.in";

const QUICK_ACTIONS = [
  {
    label: "Check in / out",
    href: EMPLOYEE_ROUTES.attendance,
    icon: CalendarCheck,
  },
  {
    label: "Apply leave",
    href: EMPLOYEE_ROUTES.leave,
    icon: CalendarDays,
  },
  {
    label: "Download payslip",
    href: EMPLOYEE_ROUTES.payroll,
    icon: Wallet,
  },
  {
    label: "Reset password",
    href: EMPLOYEE_ROUTES.settings,
    icon: KeyRound,
  },
] as const;

const MUST_KNOW = [
  {
    icon: Clock3,
    title: "Check-in closes at 10:07 AM",
    body: "Mark attendance before 10:07 AM. Checkout never locks — punch out anytime after you check in.",
  },
  {
    icon: IdCard,
    title: "Digital ID QR",
    body: "Flip your attendance ID card and scan the QR for this month's present, late, absents, leaves, and performance.",
  },
  {
    icon: Mail,
    title: "Need support?",
    body: "Ask your manager for attendance or leave. For payroll, documents, assets, or account help, contact HR.",
  },
] as const;

const QUICK_FAQS = [
  {
    q: "I missed check-in. What now?",
    a: "Request regularization from Attendance, or ask your manager / HR to help correct the day.",
  },
  {
    q: "Where is my payslip?",
    a: "Open Payroll after HR publishes the month, then download the payslip from history.",
  },
  {
    q: "How do I change my password?",
    a: "Settings → Account & security → Reset password. Use at least 12 characters with upper, lower, number, and a special character.",
  },
  {
    q: "How do I silence notification sounds?",
    a: "Settings → Notifications → Mute, or pick a quieter tone and save.",
  },
  {
    q: "How do I apply for leave?",
    a: "Open Leave → Apply Leave, pick dates and leave type, then submit. Track status on the same page.",
  },
  {
    q: "How do I upload documents?",
    a: "Open Documents → choose a folder → Upload. Document types match that folder (e.g. Personal shows Resume / Photo).",
  },
] as const;

export function EmployeeHelpView({ firstName }: { firstName: string }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="rounded-2xl border bg-gradient-to-br from-sky-500/10 via-card to-violet-500/10 px-5 py-4 shadow-sm">
          <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            <CircleHelp className="size-3.5 text-sky-600" />
            Employee Help
          </div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Hi {firstName}, quick help
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Short answers for everyday work. Use the left sidebar to open any module.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((item) => {
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

        <section className="grid gap-3 sm:grid-cols-3">
          {MUST_KNOW.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl border bg-card p-3.5 shadow-sm">
                <Icon className="size-4 text-sky-600" />
                <p className="mt-2 text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                {item.title === "Need support?" ? (
                  <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="text-muted-foreground">HR support:</span>
                    <a
                      href={`mailto:${HR_EMAIL}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-sky-700 hover:underline dark:text-sky-400"
                    >
                      <Mail className="size-3.5" />
                      {HR_EMAIL}
                    </a>
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold tracking-tight">Common questions</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_FAQS.map((faq) => (
              <div key={faq.q} className="rounded-lg border bg-muted/20 px-3 py-2.5">
                <p className="text-sm font-medium">{faq.q}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
