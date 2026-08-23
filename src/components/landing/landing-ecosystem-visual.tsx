import {
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  Sparkles,
  UserCircle,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EcosystemCard = {
  label: string;
  icon: LucideIcon;
  className: string;
  delay: string;
};

const CARDS: EcosystemCard[] = [
  {
    label: "Leave Balance",
    icon: CalendarClock,
    className: "landing-eco-card--top",
    delay: "0.35s",
  },
  {
    label: "Attendance",
    icon: ClipboardList,
    className: "landing-eco-card--left",
    delay: "0.5s",
  },
  {
    label: "Payroll",
    icon: Wallet,
    className: "landing-eco-card--right",
    delay: "0.65s",
  },
  {
    label: "Employee Profile",
    icon: UserCircle,
    className: "landing-eco-card--bottom-left",
    delay: "0.8s",
  },
  {
    label: "Performance",
    icon: Sparkles,
    className: "landing-eco-card--bottom-right",
    delay: "0.95s",
  },
];

type LandingEcosystemVisualProps = {
  variant?: "hero" | "connected";
  compact?: boolean;
  className?: string;
};

export function LandingEcosystemVisual({
  variant = "hero",
  compact = false,
  className,
}: LandingEcosystemVisualProps) {
  return (
    <div
      className={cn(
        "landing-ecosystem",
        variant === "connected" && "landing-ecosystem--connected",
        compact && "landing-ecosystem--compact",
        className,
      )}
      aria-hidden
    >
      <div className="landing-ecosystem-glow" />

      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={cn("landing-eco-card landing-animate-in", card.className)}
            style={{ animationDelay: card.delay }}
          >
            <Icon className="size-4 text-sky-500 dark:text-sky-300" strokeWidth={2.2} />
            <span>{card.label}</span>
          </div>
        );
      })}

      <div
        className="landing-eco-core landing-animate-in"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="landing-eco-core-inner">
          <LayoutDashboard className="size-7 text-sky-600 dark:text-sky-200" strokeWidth={2.1} />
          <span>HRMS Core</span>
          <small>Dashboard</small>
        </div>
      </div>
    </div>
  );
}
