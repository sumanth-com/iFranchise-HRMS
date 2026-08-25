"use client";

import {
  Bell,
  CalendarClock,
  ClipboardList,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";

const ORBIT_ICONS = [
  { label: "Attendance", icon: ClipboardList, slot: "tl" },
  { label: "Leave", icon: CalendarClock, slot: "tr" },
  { label: "Payroll", icon: Wallet, slot: "ml" },
  { label: "Employees", icon: UserRound, slot: "mr" },
  { label: "Performance", icon: Sparkles, slot: "bl" },
  { label: "Updates", icon: Bell, slot: "br" },
] as const;

export function LandingHeroOrbitIcons() {
  return (
    <div className="landing-hero-orbit" aria-hidden>
      {ORBIT_ICONS.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`landing-hero-orbit-card landing-hero-orbit-card--${item.slot}`}
            style={{ animationDelay: `${index * 0.35}s` }}
            title={item.label}
          >
            <Icon className="size-5" strokeWidth={2.1} />
          </div>
        );
      })}
    </div>
  );
}
