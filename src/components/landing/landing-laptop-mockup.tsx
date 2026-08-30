"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Bell,
  CalendarClock,
  Clock3,
  Palmtree,
  TrendingUp,
  Wallet,
} from "lucide-react";

import brandLogo from "@/assets/Logo.png";
import { cn } from "@/lib/utils";

const TOUR_INTERVAL_MS = 4200;

type TourSlide = {
  id: string;
  title: string;
  content: ReactNode;
};

function DashboardSlide() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="rounded-lg bg-white p-2 shadow-2xs ring-1 ring-slate-200/60">
        <p className="text-[8px] font-bold text-slate-900">Good morning, team</p>
        <p className="text-[7px] text-slate-500">Your workplace dashboard</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: "Present today", value: "86", tone: "text-[#5f55ee]" },
          { label: "Hours (week)", value: "164h", tone: "text-sky-600" },
          { label: "Leave balance", value: "36 days", tone: "text-violet-600" },
          { label: "Pending", value: "4", tone: "text-amber-600" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg bg-white p-1.5 shadow-2xs ring-1 ring-slate-200/60"
          >
            <span className="text-[6.5px] text-slate-500">{stat.label}</span>
            <p className={cn("text-[10px] font-extrabold tabular-nums", stat.tone)}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-white p-2 shadow-2xs ring-1 ring-slate-200/60">
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-bold text-slate-800">Weekly attendance</span>
          <TrendingUp className="size-2.5 text-emerald-500" />
        </div>
        <svg className="mt-1 h-8 w-full" viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0,28 C18,24 32,30 48,18 C64,8 78,14 92,10 C102,7 110,12 120,8"
            fill="none"
            stroke="#5f55ee"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

function AttendanceSlide() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="flex items-center justify-between rounded-lg bg-[#5f55ee] p-2 text-white shadow-xs">
        <div>
          <p className="text-[7px] font-semibold text-white/80">Today</p>
          <p className="text-[9px] font-bold">Checked in · 09:42 am</p>
        </div>
        <Clock3 className="size-3.5 opacity-90" />
      </div>
      <div className="grid grid-cols-3 gap-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
          <div
            key={day}
            className={cn(
              "rounded-md px-1 py-1 text-center text-[6.5px] font-semibold",
              i < 4
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                : "bg-slate-100 text-slate-500",
            )}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-white p-2 shadow-2xs ring-1 ring-slate-200/60">
        <p className="text-[7px] font-bold text-slate-800">Team check-ins</p>
        {[
          { name: "Alex Rivera", time: "09:12 am", ok: true },
          { name: "Sophia Chen", time: "09:42 am", ok: true },
          { name: "James Carter", time: "Pending", ok: false },
        ].map((row) => (
          <div
            key={row.name}
            className="mt-1 flex items-center justify-between rounded-md bg-slate-50 px-1.5 py-1"
          >
            <span className="text-[7px] font-semibold text-slate-700">{row.name}</span>
            <span
              className={cn(
                "text-[6.5px] font-bold",
                row.ok ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {row.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaveSlide() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-white p-2 shadow-2xs ring-1 ring-slate-200/60">
          <Palmtree className="size-3 text-sky-500" />
          <p className="mt-0.5 text-[6.5px] text-slate-500">Balance</p>
          <p className="text-[10px] font-extrabold text-slate-900">36 days</p>
        </div>
        <div className="rounded-lg bg-white p-2 shadow-2xs ring-1 ring-slate-200/60">
          <CalendarClock className="size-3 text-[#5f55ee]" />
          <p className="mt-0.5 text-[6.5px] text-slate-500">Pending</p>
          <p className="text-[10px] font-extrabold text-amber-600">2 requests</p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-white p-2 shadow-2xs ring-1 ring-slate-200/60">
        <p className="text-[7px] font-bold text-slate-800">Leave requests</p>
        {[
          { type: "Annual leave", dates: "12–14 Aug", status: "Approved" },
          { type: "Work from home", dates: "22 Aug", status: "Pending" },
          { type: "Sick leave", dates: "05 Sep", status: "Review" },
        ].map((row) => (
          <div
            key={row.type}
            className="mt-1 flex items-center justify-between gap-1 rounded-md bg-slate-50 px-1.5 py-1"
          >
            <div className="min-w-0">
              <p className="text-[7px] font-semibold text-slate-800">{row.type}</p>
              <p className="text-[6px] text-slate-500">{row.dates}</p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[6px] font-bold",
                row.status === "Approved"
                  ? "bg-emerald-50 text-emerald-700"
                  : row.status === "Pending"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-sky-50 text-sky-700",
              )}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PayrollSlide() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="rounded-lg bg-gradient-to-br from-[#5f55ee] to-[#7c3aed] p-2 text-white shadow-xs">
        <p className="text-[7px] font-semibold text-white/80">August payslip</p>
        <p className="text-[11px] font-black tracking-tight">₹ 84,250.00</p>
        <p className="text-[6.5px] text-white/75">Net pay · credited 28 Aug</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-white p-1.5 shadow-2xs ring-1 ring-slate-200/60">
          <span className="text-[6.5px] text-slate-500">Gross</span>
          <p className="text-[9px] font-bold text-slate-900">₹ 98,400</p>
        </div>
        <div className="rounded-lg bg-white p-1.5 shadow-2xs ring-1 ring-slate-200/60">
          <span className="text-[6.5px] text-slate-500">Deductions</span>
          <p className="text-[9px] font-bold text-rose-600">₹ 14,150</p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-between rounded-lg bg-white p-2 shadow-2xs ring-1 ring-slate-200/60">
        <div>
          <p className="text-[7px] font-bold text-slate-800">Recent payslips</p>
          {["Jul 2026", "Jun 2026", "May 2026"].map((month) => (
            <div
              key={month}
              className="mt-1 flex items-center justify-between rounded-md bg-slate-50 px-1.5 py-1"
            >
              <span className="text-[7px] font-semibold text-slate-700">{month}</span>
              <Wallet className="size-2.5 text-[#5f55ee]" />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-1 rounded-full bg-[#5f55ee] py-1 text-[7px] font-bold text-white"
        >
          Download payslip
        </button>
      </div>
    </div>
  );
}

const TOUR_SLIDES: TourSlide[] = [
  { id: "dashboard", title: "Dashboard", content: <DashboardSlide /> },
  { id: "attendance", title: "Attendance", content: <AttendanceSlide /> },
  { id: "leave", title: "Leave", content: <LeaveSlide /> },
  { id: "payroll", title: "Payroll", content: <PayrollSlide /> },
];

export function LandingLaptopMockup() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % TOUR_SLIDES.length);
    }, TOUR_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  const activeSlide = TOUR_SLIDES[activeIdx];

  return (
    <div className="relative mx-auto flex w-full max-w-[440px] flex-col items-center sm:max-w-[470px]">
      <div className="relative w-full overflow-hidden rounded-t-xl border-[3.5px] border-b-0 border-[#1c1f2b] bg-[#0c0d14] shadow-[0_25px_60px_rgba(0,0,0,0.4)] sm:rounded-t-2xl sm:border-[4.5px]">
        <div className="absolute top-0 left-1/2 z-30 flex h-2 w-14 -translate-x-1/2 items-center justify-center rounded-b-md bg-[#1c1f2b]">
          <div className="size-1 rounded-full bg-[#3b4154]" />
        </div>

        <div className="relative flex aspect-[16/10] w-full select-none flex-col bg-[#f6f7fb] p-3 text-[9px] leading-tight text-slate-800 sm:p-3.5">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200/80 pb-2">
            <div className="flex items-center gap-1.5">
              <div className="flex size-5.5 items-center justify-center rounded-md bg-gradient-to-tr from-[#5f55ee] to-[#8b5cf6] p-0.5 text-white shadow-2xs">
                <Image src={brandLogo} alt="" width={15} height={15} className="rounded-xs" />
              </div>
              <span className="text-[11px] font-extrabold tracking-tight text-slate-900">
                iFranchise
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-1">
              <span
                className="truncate text-[8.5px] font-bold text-slate-700 transition-opacity duration-300"
                key={activeSlide.id}
              >
                {activeSlide.title}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500">
              <div className="relative flex size-5 items-center justify-center rounded-md bg-white shadow-2xs">
                <Bell className="size-2.5" />
                <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-rose-500" />
              </div>
              <div className="flex size-5.5 items-center justify-center rounded-full bg-[#5f55ee] font-bold text-white shadow-2xs">
                <span className="text-[7.5px]">IF</span>
              </div>
            </div>
          </header>

          <div className="relative my-1.5 min-h-0 flex-1 overflow-hidden">
            {TOUR_SLIDES.map((slide, idx) => (
              <div
                key={slide.id}
                className={cn(
                  "absolute inset-0 transition-all duration-700 ease-out",
                  idx === activeIdx
                    ? "z-10 translate-y-0 opacity-100"
                    : "z-0 translate-y-1 opacity-0 pointer-events-none",
                  reducedMotion && "transition-none",
                )}
                aria-hidden={idx !== activeIdx}
              >
                {slide.content}
              </div>
            ))}
          </div>

          <div className="flex shrink-0 items-center justify-center gap-1 pt-0.5" aria-hidden>
            {TOUR_SLIDES.map((slide, idx) => (
              <span
                key={slide.id}
                className={cn(
                  "h-1 rounded-full bg-slate-300 transition-all duration-500",
                  idx === activeIdx ? "w-3 bg-[#5f55ee]" : "w-1",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex h-3 w-[106%] items-center justify-center rounded-b-xl border-t border-white/20 bg-gradient-to-b from-[#2e3342] via-[#20242e] to-[#14161d] shadow-[0_14px_30px_rgba(0,0,0,0.4)] sm:h-3.5">
        <div className="h-1 w-14 rounded-full bg-[#0e1015] opacity-90 sm:w-16" />
      </div>

      <div className="h-3 w-[88%] rounded-full bg-black/40 blur-md" />
    </div>
  );
}
