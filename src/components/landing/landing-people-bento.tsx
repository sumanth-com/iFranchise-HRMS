"use client";

import Image from "next/image";
import type { StaticImageData } from "next/image";

import ceoIllustration from "@/assets/ceo.png";
import employeeIllustration from "@/assets/Employee.png";
import hrIllustration from "@/assets/HR.png";
import managerIllustration from "@/assets/Manager.png";
import workplaceIllustration from "@/assets/workplace.png";
import { cn } from "@/lib/utils";

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
      "Company overview, revenue, active projects, and team performance — executive dashboards when leadership needs the full picture.",
    span: "double",
  },
  {
    key: "platform",
    title: "One connected workspace",
    description:
      "Payroll cycles, salary processing, and payouts stay tied to attendance, leave, and people records on one iFranchise platform.",
    span: false,
  },
] as const;

type CardKey = (typeof CARDS)[number]["key"];

const CARD_IMAGES: Record<CardKey, StaticImageData> = {
  employee: employeeIllustration,
  manager: managerIllustration,
  hr: hrIllustration,
  ceo: ceoIllustration,
  platform: workplaceIllustration,
};

function BentoImageVisual({
  cardKey,
  span = false,
}: {
  cardKey: CardKey;
  span?: false | "double";
}) {
  const src = CARD_IMAGES[cardKey];

  return (
    <div
      className={cn(
        "landing-bento-visual landing-bento-visual--asset",
        span === "double" && "landing-bento-visual--wide",
      )}
      aria-hidden
    >
      <Image
        src={src}
        alt=""
        width={src.width}
        height={src.height}
        className="landing-bento-asset-img"
        sizes={
          span === "double"
            ? "(min-width: 1024px) 66vw, 100vw"
            : "(min-width: 1024px) 33vw, 50vw"
        }
      />
    </div>
  );
}

export function LandingPeopleBento() {
  return (
    <ul className="landing-people-bento">
      {CARDS.map((card, index) => (
        <li
          key={card.key}
          className={cn(
            "landing-people-bento-card landing-animate-up",
            card.span === "double" && "landing-people-bento-card--span",
            card.key === "platform" && "landing-people-bento-card--platform",
          )}
          style={{ animationDelay: `${0.06 + index * 0.07}s` }}
        >
          <BentoImageVisual cardKey={card.key} span={card.span} />
          <div className="landing-people-bento-copy">
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
