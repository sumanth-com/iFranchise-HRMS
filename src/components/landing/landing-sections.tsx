import {
  ArrowRight,
  Bell,
  CalendarClock,
  ClipboardList,
  Sparkles,
  UserCircle,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NODES = [
  { label: "Attendance", icon: ClipboardList },
  { label: "Leave", icon: CalendarClock },
  { label: "Payroll", icon: Wallet },
  { label: "Employees", icon: UserCircle },
  { label: "Performance", icon: Sparkles },
  { label: "Company Updates", icon: Bell },
] as const satisfies ReadonlyArray<{ label: string; icon: LucideIcon }>;

export function LandingConnectedSection() {
  return (
    <section
      className="landing-section landing-connected"
      aria-labelledby="landing-connected-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="landing-connected-heading" className="landing-section-title">
            Your workplace, connected.
          </h2>
          <p className="landing-section-copy">
            One platform bringing the essential parts of your workday together.
          </p>
        </div>

        <ul className="landing-connected-nodes landing-connected-nodes--grid" aria-label="Connected modules">
          {NODES.map((node, index) => {
            const Icon = node.icon;
            return (
              <li
                key={node.label}
                className="landing-connected-node landing-animate-up"
                style={{ animationDelay: `${0.1 + index * 0.08}s` }}
              >
                <Icon className="size-4 text-sky-500 dark:text-sky-300" strokeWidth={2.2} />
                {node.label}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    title: "Attendance",
    description: "Track attendance, working hours and daily activity.",
    icon: ClipboardList,
  },
  {
    title: "Leave",
    description: "Apply, manage and review leave requests.",
    icon: CalendarClock,
  },
  {
    title: "Payroll",
    description: "Access salary information and payslips securely.",
    icon: Wallet,
  },
  {
    title: "Employees",
    description: "Find employee information and organizational details.",
    icon: UserCircle,
  },
  {
    title: "Performance",
    description: "Track goals, reviews and professional growth.",
    icon: Sparkles,
  },
  {
    title: "Company Updates",
    description: "Stay informed about announcements and important updates.",
    icon: Bell,
  },
] as const;

export function LandingFeaturesSection() {
  return (
    <section
      id="features"
      className="landing-section"
      aria-labelledby="landing-features-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="landing-features-heading" className="landing-section-title">
            Everything you need for your workday.
          </h2>
        </div>

        <ul className="landing-feature-grid">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <li
                key={feature.title}
                className="group landing-feature-card landing-animate-up"
                style={{ animationDelay: `${0.05 + index * 0.06}s` }}
              >
                <div className="landing-feature-icon">
                  <Icon className="size-5" strokeWidth={2.2} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
                <ArrowRight
                  className="mt-auto size-4 text-sky-500 opacity-70 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
