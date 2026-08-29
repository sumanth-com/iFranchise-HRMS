"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Bell,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  Target,
  UserRound,
  Wallet,
  FolderOpen,
  Palmtree,
  Package,
  Settings,
} from "lucide-react";

import brandLogo from "@/assets/Logo.png";

function wishForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function useCountUp(target: number, active: boolean, durationMs = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, durationMs, target]);

  return value;
}

function AliveSparkline({ active }: { active: boolean }) {
  const path =
    "M0,48 C35,44 60,58 95,34 C130,12 165,22 200,18 C235,14 265,32 300,24 C330,18 350,12 380,16";

  return (
    <svg
      key={active ? "alive" : "idle"}
      className="landing-hero-preview-chart"
      viewBox="0 0 380 64"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="landingChartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(124,58,237,0.28)" />
          <stop offset="100%" stopColor="rgba(124,58,237,0)" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L380,64 L0,64 Z`}
        fill="url(#landingChartFill)"
        className={active ? "is-alive" : undefined}
      />
      <path
        d={path}
        fill="none"
        stroke="#7c3aed"
        strokeWidth="2.4"
        strokeLinecap="round"
        className={
          active
            ? "is-alive landing-hero-preview-chart-line"
            : "landing-hero-preview-chart-line"
        }
      />
    </svg>
  );
}

const SIDEBAR_ITEMS: Array<{
  label: string;
  icon: typeof LayoutDashboard;
  active?: boolean;
}> = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "My Profile", icon: UserRound },
  { label: "Attendance", icon: Clock3 },
  { label: "Payroll", icon: Wallet },
  { label: "Documents", icon: FolderOpen },
  { label: "Leave", icon: Palmtree },
  { label: "My Goals", icon: Target },
  { label: "Assets", icon: Package },
  { label: "Notifications", icon: Bell },
  { label: "Settings", icon: Settings },
];

/**
 * Decorative self-service portal mock for the public landing hero only.
 * Dummy numbers + motion — no auth, no live HRMS data, no portal routing.
 */
export function LandingHeroPortalPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [wish, setWish] = useState("Good morning");
  const [clockLabel, setClockLabel] = useState("");

  const teamPresent = useCountUp(86, active);
  const leaveBalance = useCountUp(36, active, 1100);
  const pendingRequests = useCountUp(4, active, 900);
  const hoursLogged = useCountUp(164, active, 1300);

  const dateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date());
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    const syncClock = () => {
      const now = new Date();
      setWish(wishForHour(now.getHours()));
      try {
        setClockLabel(
          new Intl.DateTimeFormat("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }).format(now),
        );
      } catch {
        setClockLabel("");
      }
    };

    syncClock();
    const id = window.setInterval(syncClock, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setActive(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.22 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="landing-hero-preview landing-animate-up"
      aria-hidden
    >
      <div className="landing-hero-preview-glow" />
      <div className="landing-hero-preview-frame">
        <aside className="landing-hero-preview-sidebar is-collapsed">
          <div className="landing-hero-preview-brand" title="iFranchise">
            <Image
              src={brandLogo}
              alt=""
              width={28}
              height={28}
              className="landing-hero-preview-brand-logo"
            />
          </div>
          <ul className="landing-hero-preview-nav">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.label}
                  className={item.active ? "is-active" : undefined}
                  title={item.label}
                >
                  <Icon className="size-4" strokeWidth={2.1} />
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="landing-hero-preview-main">
          <header className="landing-hero-preview-topbar">
            <span>Dashboard</span>
            <div className="landing-hero-preview-topbar-right">
              <span className="landing-hero-preview-bell" title="Notifications">
                <Bell className="size-3.5" strokeWidth={2.25} />
                <em>1</em>
              </span>
              <span className="landing-hero-preview-avatar" title="iFranchise">
                <Image
                  src={brandLogo}
                  alt=""
                  width={22}
                  height={22}
                  className="landing-hero-preview-avatar-logo"
                />
              </span>
            </div>
          </header>

          <div className="landing-hero-preview-greeting">
            <div>
              <h2>
                {wish}, iFranchise
              </h2>
              <p>Your workplace self-service portal</p>
            </div>
            <div className="landing-hero-preview-datetime">
              <span>{dateLabel}</span>
              <strong>{clockLabel}</strong>
            </div>
          </div>

          <div className="landing-hero-preview-stats">
            <article>
              <span>Team present today</span>
              <strong>{teamPresent}</strong>
            </article>
            <article>
              <span>Hours logged (week)</span>
              <strong>{hoursLogged}h</strong>
            </article>
            <article>
              <span>Leave balance</span>
              <strong>{leaveBalance} days</strong>
            </article>
            <article>
              <span>Pending requests</span>
              <strong>{pendingRequests}</strong>
            </article>
          </div>

          <div className="landing-hero-preview-panels">
            <div className="landing-hero-preview-chart-card">
              <div className="landing-hero-preview-chart-head">
                <div>
                  <span>Attendance</span>
                  <strong>Weekly overview</strong>
                </div>
              </div>
              <AliveSparkline active={active} />
            </div>

            <div className="landing-hero-preview-side-cards">
              <div className="landing-hero-preview-attendance">
                <p>Mark attendance for today</p>
                <div className="landing-hero-preview-pills">
                  <span>On time</span>
                  <span>Check In: 09:42 am</span>
                </div>
                <span className="landing-hero-preview-checkout">Check Out</span>
              </div>
              <div className="landing-hero-preview-holiday">
                <span>Performance goal</span>
                <strong>Q3 objective</strong>
                <em>On track · 72% complete</em>
              </div>
            </div>
          </div>

          <div className="landing-hero-preview-activity">
            <article className="landing-hero-preview-activity-card">
              <header>
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Recent approvals</span>
              </header>
              <ul>
                <li>
                  <strong>Leave request</strong>
                  <span>Approved · 2 days ago</span>
                </li>
                <li>
                  <strong>Attendance correction</strong>
                  <span>Pending · yesterday</span>
                </li>
                <li>
                  <strong>Goal check-in</strong>
                  <span>Completed · this week</span>
                </li>
              </ul>
            </article>

            <article className="landing-hero-preview-activity-card">
              <header>
                <FileText className="size-4 text-sky-500" />
                <span>Documents & payroll</span>
              </header>
              <ul>
                <li>
                  <strong>Payslip published</strong>
                  <span>Ready · this month</span>
                </li>
                <li>
                  <strong>Policy update</strong>
                  <span>Leave handbook · new</span>
                </li>
                <li>
                  <strong>Holiday calendar</strong>
                  <span>Synced · Q3</span>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
