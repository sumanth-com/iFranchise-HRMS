import {
  Bell,
  CalendarClock,
  ClipboardList,
  Sparkles,
  UserCircle,
  Wallet,
} from "lucide-react";

import { LandingLaptopMockup } from "@/components/landing/landing-laptop-mockup";

const LEFT_FEATURES = [
  {
    title: "Attendance",
    description: "Track attendance, working hours and daily activity.",
    icon: ClipboardList,
  },
  {
    title: "Employee",
    description: "Find employee information and organizational details.",
    icon: UserCircle,
  },
  {
    title: "Leave",
    description: "Apply, manage and review leave request.",
    icon: CalendarClock,
  },
] as const;

const RIGHT_FEATURES = [
  {
    title: "Payroll",
    description: "Access salary information and payslips securely.",
    icon: Wallet,
  },
  {
    title: "Company Updates",
    description: "Stay informed about announcements and important updates.",
    icon: Bell,
  },
  {
    title: "Performance",
    description: "Track goals, review and professional growth.",
    icon: Sparkles,
  },
] as const;

function FeatureCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof ClipboardList;
}) {
  return (
    <div className="flex flex-col justify-center rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-6px_rgba(95,85,238,0.14)] dark:border-slate-800/90 dark:bg-[#131726] sm:p-6">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#5f55ee] text-white shadow-xs">
        <Icon className="size-5" strokeWidth={2.2} />
      </div>
      <h3 className="mt-3.5 text-[15px] font-bold text-slate-900 dark:text-white sm:text-base">
        {title}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:text-[13px]">
        {description}
      </p>
    </div>
  );
}

export function LandingFeaturesSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden py-16 sm:py-24"
      aria-labelledby="landing-features-heading"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-[#5f55ee] uppercase dark:text-indigo-400 sm:text-sm">
            ALL-IN-ONE HR SUITE
          </p>
          <h2
            id="landing-features-heading"
            className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl"
          >
            Everything you need for your workday.
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 sm:text-base lg:text-lg">
            One platform bringing the essential parts of your workday together.
          </p>
        </div>

        {/* 3-Column Showcase Layout */}
        <div className="mt-12 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-6">
          {/* Left Column (3 cards) */}
          <div className="flex flex-col justify-between gap-4 sm:gap-5 lg:col-span-3">
            {LEFT_FEATURES.map((feature) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            ))}
          </div>

          {/* Center Column (Purple Card with Laptop Showcase) */}
          <div className="relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#6366f1] via-[#5f55ee] to-[#4f46e5] p-5 shadow-2xl sm:p-6 lg:col-span-6 lg:min-h-[420px]">
            {/* Ambient Lighting Overlay */}
            <div
              className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-white/15 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-black/15 blur-3xl"
              aria-hidden
            />

            {/* Laptop Mockup */}
            <div className="relative z-10 flex w-full items-center justify-center">
              <LandingLaptopMockup />
            </div>
          </div>

          {/* Right Column (3 cards) */}
          <div className="flex flex-col justify-between gap-4 sm:gap-5 lg:col-span-3">
            {RIGHT_FEATURES.map((feature) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
