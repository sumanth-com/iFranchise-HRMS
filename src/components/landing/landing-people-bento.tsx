"use client";

import Image from "next/image";
import {
  Bell,
  CalendarClock,
  ClipboardList,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import brandLogo from "@/assets/Logo.png";

const CARDS = [
  {
    key: "employee",
    title: "Employee",
    description:
      "Everything you need for your everyday work — attendance, leave, payslips and updates in one place.",
    span: false,
  },
  {
    key: "manager",
    title: "Manager",
    description:
      "Clear visibility into your team's activities, requests and approvals without switching tools.",
    span: false,
  },
  {
    key: "hr",
    title: "HR",
    description:
      "Centralized tools to manage people, workplace processes and employee information securely.",
    span: false,
  },
  {
    key: "ceo",
    title: "CEO",
    description:
      "A clear view of workforce health, approvals and organizational progress — ready when you need it.",
    span: true,
  },
  {
    key: "platform",
    title: "One connected workplace",
    description:
      "Attendance, leave, payroll and more orbit around a single iFranchise platform.",
    span: false,
  },
] as const;

function EmployeeVisual() {
  return (
    <div className="landing-bento-visual" aria-hidden>
      <div className="landing-bento-float landing-bento-float--a">
        <ClipboardList className="size-3.5" />
        Check in
      </div>
      <div className="landing-bento-float landing-bento-float--b">
        <CalendarClock className="size-3.5" />
        Leave balance
      </div>
      <div className="landing-bento-float landing-bento-float--c">
        <Wallet className="size-3.5" />
        Payslip ready
      </div>
      <div className="landing-bento-chip landing-bento-chip--soft">My day</div>
    </div>
  );
}

function ManagerVisual() {
  return (
    <div className="landing-bento-visual" aria-hidden>
      <div className="landing-bento-panel landing-bento-panel--alive">
        <div className="landing-bento-panel-head">
          <span className="landing-bento-avatars">
            <i />
            <i />
            <i />
          </span>
          <em>3 pending</em>
        </div>
        <strong>Team leave request</strong>
        <p>Review and approve in one click</p>
        <div className="landing-bento-bubble">
          <Bell className="size-3" />
          New request from your team
        </div>
      </div>
    </div>
  );
}

function HrVisual() {
  return (
    <div className="landing-bento-visual" aria-hidden>
      <div className="landing-bento-calendar landing-bento-calendar--alive">
        <header>
          <span>Payroll cycle</span>
          <em>Repeat monthly</em>
        </header>
        <div className="landing-bento-calendar-grid">
          {Array.from({ length: 14 }).map((_, index) => (
            <span
              key={index}
              className={
                index === 8 || index === 9
                  ? "is-active"
                  : index === 4
                    ? "is-soft"
                    : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CeoVisual() {
  return (
    <div className="landing-bento-visual landing-bento-visual--wide" aria-hidden>
      <div className="landing-bento-ceo landing-bento-ceo--alive">
        <div className="landing-bento-ceo-head">
          <div>
            <span>Executive overview</span>
            <strong>Workplace at a glance</strong>
          </div>
          <em>Live sample</em>
        </div>
        <div className="landing-bento-ceo-metrics">
          <article>
            <span>Attendance</span>
            <strong>94%</strong>
          </article>
          <article>
            <span>Open approvals</span>
            <strong>12</strong>
          </article>
          <article>
            <span>Hiring pipeline</span>
            <strong>8</strong>
          </article>
          <article>
            <span>Leave today</span>
            <strong>6</strong>
          </article>
        </div>
        <div className="landing-bento-ceo-foot">
          <p>Workforce health looks steady across teams this week.</p>
          <span className="landing-bento-ceo-cta">
            <Sparkles className="size-3.5" />
            View insights
          </span>
        </div>
      </div>
    </div>
  );
}

const ORBIT_ITEMS = [
  { label: "Attendance", icon: ClipboardList, angle: 0 },
  { label: "Leave", icon: CalendarClock, angle: 72 },
  { label: "Payroll", icon: Wallet, angle: 144 },
  { label: "People", icon: Users, angle: 216 },
  { label: "Updates", icon: Bell, angle: 288 },
] as const;

function PlatformVisual() {
  return (
    <div className="landing-bento-visual" aria-hidden>
      <div className="landing-bento-orbit">
        <div className="landing-bento-orbit-ring" />
        <div className="landing-bento-orbit-core">
          <Image
            src={brandLogo}
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-xl object-contain"
          />
        </div>
        {ORBIT_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="landing-bento-orbit-item"
              style={{ ["--orbit-angle" as string]: `${item.angle}deg` }}
            >
              <span>
                <Icon className="size-3.5" />
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardVisual({ cardKey }: { cardKey: (typeof CARDS)[number]["key"] }) {
  switch (cardKey) {
    case "employee":
      return <EmployeeVisual />;
    case "manager":
      return <ManagerVisual />;
    case "hr":
      return <HrVisual />;
    case "ceo":
      return <CeoVisual />;
    case "platform":
      return <PlatformVisual />;
    default:
      return null;
  }
}

export function LandingPeopleBento() {
  return (
    <ul className="landing-people-bento">
      {CARDS.map((card, index) => (
        <li
          key={card.key}
          className={`landing-people-bento-card${
            card.span ? " landing-people-bento-card--span" : ""
          } landing-animate-up`}
          style={{ animationDelay: `${0.06 + index * 0.07}s` }}
        >
          <CardVisual cardKey={card.key} />
          <div className="landing-people-bento-copy">
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
