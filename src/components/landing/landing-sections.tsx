import {
  Bell,
  CalendarClock,
  ClipboardList,
  Sparkles,
  UserCircle,
  Wallet,
} from "lucide-react";

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
    title: "Employee",
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
      className="landing-section landing-features"
      aria-labelledby="landing-features-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="landing-features-heading" className="landing-section-title">
            Everything you need for your workday.
          </h2>
          <p className="landing-section-copy">
            One platform bringing the essential parts of your workday together.
          </p>
        </div>

        <ul className="landing-feature-grid">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <li
                key={feature.title}
                className="landing-feature-card landing-animate-up"
                style={{ animationDelay: `${0.05 + index * 0.06}s` }}
              >
                <div className="landing-feature-icon">
                  <Icon className="size-[1.05rem]" strokeWidth={2.2} />
                </div>
                <div className="landing-feature-copy">
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
