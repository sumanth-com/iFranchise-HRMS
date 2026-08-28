import {
  Bell,
  CalendarClock,
  ClipboardList,
  Sparkles,
  UserCircle,
  Wallet,
} from "lucide-react";

import { LandingLaptopMockup } from "@/components/landing/landing-laptop-mockup";
import { LandingSectionHeading } from "@/components/landing/landing-section-heading";

type Feature = {
  title: string;
  description: string;
  icon: typeof ClipboardList;
};

const LEFT_FEATURES: Feature[] = [
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
];

const RIGHT_FEATURES: Feature[] = [
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
];

function FeatureCard({
  title,
  description,
  icon: Icon,
}: Feature) {
  return (
    <div className="flex flex-col justify-center rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-6px_rgba(95,85,238,0.14)] dark:border-slate-800/90 dark:bg-[#131726] sm:p-5 lg:p-6">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#5f55ee] text-white shadow-xs sm:size-10">
        <Icon className="size-4 sm:size-5" strokeWidth={2.2} />
      </div>
      <h3 className="mt-2.5 text-sm font-bold text-slate-900 dark:text-white sm:mt-3.5 sm:text-[15px] lg:text-base">
        {title}
      </h3>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 sm:text-xs lg:text-[13px]">
        {description}
      </p>
    </div>
  );
}

function LaptopShowcase() {
  return (
    <div className="relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#6366f1] via-[#5f55ee] to-[#4f46e5] p-5 shadow-2xl sm:p-6 lg:min-h-[420px]">
      <div
        className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-white/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-black/15 blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 flex w-full items-center justify-center">
        <LandingLaptopMockup />
      </div>
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
        <LandingSectionHeading
          id="landing-features-heading"
          eyebrow="All-in-one HR suite"
          title={
            <>
              Everything you need for{" "}
              <span className="landing-section-title-accent">your workday.</span>
            </>
          }
          subtitle="One platform bringing the essential parts of your workday together."
        />

        {/* Mobile / tablet: paired rows with Leave + Payroll on one line */}
        <div className="mt-14 flex flex-col gap-6 lg:hidden">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <FeatureCard
              title={LEFT_FEATURES[0].title}
              description={LEFT_FEATURES[0].description}
              icon={LEFT_FEATURES[0].icon}
            />
            <FeatureCard
              title={LEFT_FEATURES[1].title}
              description={LEFT_FEATURES[1].description}
              icon={LEFT_FEATURES[1].icon}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <FeatureCard
              title={LEFT_FEATURES[2].title}
              description={LEFT_FEATURES[2].description}
              icon={LEFT_FEATURES[2].icon}
            />
            <FeatureCard
              title={RIGHT_FEATURES[0].title}
              description={RIGHT_FEATURES[0].description}
              icon={RIGHT_FEATURES[0].icon}
            />
          </div>
          <LaptopShowcase />
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <FeatureCard
              title={RIGHT_FEATURES[1].title}
              description={RIGHT_FEATURES[1].description}
              icon={RIGHT_FEATURES[1].icon}
            />
            <FeatureCard
              title={RIGHT_FEATURES[2].title}
              description={RIGHT_FEATURES[2].description}
              icon={RIGHT_FEATURES[2].icon}
            />
          </div>
        </div>

        {/* Desktop: 3-column showcase */}
        <div className="mt-14 hidden items-stretch gap-6 lg:grid lg:grid-cols-12">
          <div className="flex flex-col justify-between gap-5 lg:col-span-3">
            {LEFT_FEATURES.map((feature) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            ))}
          </div>

          <div className="lg:col-span-6">
            <LaptopShowcase />
          </div>

          <div className="flex flex-col justify-between gap-5 lg:col-span-3">
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
