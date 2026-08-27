"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Plus,
  Settings,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";

import brandLogo from "@/assets/Logo.png";

const INVOICES = [
  {
    id: "# INV-1001",
    time: "In 2 days",
    state: "Unsent",
    amount: "$ 68,750.00",
    company: "Apex Tech Corp",
    recipient: "Alex Rivera",
    role: "Engineering Director",
    initials: "AR",
    item: "UI/UX & Platform",
    subTotal: "$ 68,750.00",
  },
  {
    id: "# INV-1002",
    time: "In 4 days",
    state: "Viewed",
    amount: "$ 21,480.00",
    company: "Nexus Labs",
    recipient: "Elena Rostova",
    role: "Product Manager",
    initials: "ER",
    item: "Product Strategy",
    subTotal: "$ 21,480.00",
  },
  {
    id: "# INV-1003",
    time: "In 5 days",
    state: "Unsent",
    amount: "$ 47,980.00",
    company: "BrightWave",
    recipient: "James Carter",
    role: "Marketing Director",
    initials: "JC",
    item: "Design & Dev",
    subTotal: "$ 47,980.00",
  },
  {
    id: "# INV-1004",
    time: "In 16 days",
    state: "Viewed",
    amount: "$ 55,230.00",
    company: "Solaria Global",
    recipient: "Sophia Chen",
    role: "VP Operations",
    initials: "SC",
    item: "HRMS Integration",
    subTotal: "$ 55,230.00",
  },
];

export function LandingLaptopMockup() {
  const [selectedIdx, setSelectedIdx] = useState(2); // INV-1003 default
  const [pulseTick, setPulseTick] = useState(0);

  useEffect(() => {
    const cycleTimer = setInterval(() => {
      setSelectedIdx((prev) => (prev + 1) % INVOICES.length);
    }, 4500);

    const pulseTimer = setInterval(() => {
      setPulseTick((t) => (t + 1) % 100);
    }, 1500);

    return () => {
      clearInterval(cycleTimer);
      clearInterval(pulseTimer);
    };
  }, []);

  const activeInvoice = INVOICES[selectedIdx];

  return (
    <div className="relative mx-auto flex w-full max-w-[440px] flex-col items-center sm:max-w-[470px]">
      {/* Real Laptop Screen Lid / Thin Border */}
      <div className="relative w-full overflow-hidden rounded-t-xl border-[3.5px] border-b-0 border-[#1c1f2b] bg-[#0c0d14] shadow-[0_25px_60px_rgba(0,0,0,0.4)] sm:rounded-t-2xl sm:border-[4.5px]">
        {/* Top Notch Camera */}
        <div className="absolute top-0 left-1/2 z-30 flex h-2 w-14 -translate-x-1/2 items-center justify-center rounded-b-md bg-[#1c1f2b]">
          <div className="size-1 rounded-full bg-[#3b4154]" />
        </div>

        {/* Real Widescreen Display (16:10 Laptop Proportion) */}
        <div className="relative flex aspect-[16/10] w-full select-none flex-col justify-between bg-[#f6f7fb] p-3 text-[9px] leading-tight text-slate-800 sm:p-3.5">
          {/* 1. Header Bar */}
          <header className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            {/* Left Brand Identity */}
            <div className="flex items-center gap-1.5">
              <div className="flex size-5.5 items-center justify-center rounded-md bg-gradient-to-tr from-[#5f55ee] to-[#8b5cf6] p-0.5 text-white shadow-2xs">
                <Image src={brandLogo} alt="" width={15} height={15} className="rounded-xs" />
              </div>
              <span className="text-[11px] font-extrabold tracking-tight text-slate-900">
                iFranchise
              </span>
            </div>

            {/* Sub-nav Title & Action */}
            <div className="flex items-center gap-1.5">
              <span className="text-[8.5px] font-bold text-slate-700">Invoices & Settlements</span>
            </div>

            {/* Right Action Icons & Profile */}
            <div className="flex items-center gap-1.5 text-slate-500">
              <div className="relative flex size-5 items-center justify-center rounded-md bg-white shadow-2xs">
                <Bell className="size-2.5" />
                <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-rose-500 animate-pulse" />
              </div>
              <div className="flex size-5.5 items-center justify-center rounded-full bg-[#5f55ee] font-bold text-white shadow-2xs">
                <span className="text-[7.5px]">SR</span>
              </div>
            </div>
          </header>

          {/* 2. Top Metric Row (4 Compact Clean Cards) */}
          <div className="my-1.5 grid grid-cols-4 gap-2">
            {/* Card 1: Overdue */}
            <div className="flex flex-col justify-between rounded-lg bg-white p-2 shadow-2xs ring-1 ring-slate-200/60">
              <div className="flex items-center justify-between">
                <span className="text-[7.5px] font-medium text-slate-500">Overdue</span>
                <span className="flex size-3 items-center justify-center rounded-full bg-rose-50 text-[7px] font-bold text-rose-500 animate-pulse">
                  !
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-extrabold tracking-tight text-slate-900">
                $ 24,850
              </p>
              <div className="flex items-center text-[6.5px] font-semibold text-rose-600">
                <TrendingUp className="mr-0.5 size-2" />
                <span>+12.5%</span>
              </div>
            </div>

            {/* Card 2: Due Next Month + Mini Bar Chart */}
            <div className="flex flex-col justify-between rounded-lg bg-white p-2 shadow-2xs ring-1 ring-slate-200/60">
              <div className="flex items-center justify-between">
                <span className="text-[7.5px] font-medium text-slate-500">Due Soon</span>
                <Calendar className="size-2.5 text-[#5f55ee]" />
              </div>
              <p className="mt-0.5 text-[11px] font-extrabold tracking-tight text-slate-900">
                $ 142,560
              </p>
              {/* Micro bar chart */}
              <div className="flex items-end gap-0.5 pt-0.5">
                {[45, 65, 50, 80, 95, 100].map((h, i) => {
                  const dynamicH = Math.min(100, Math.max(30, h + ((pulseTick + i * 2) % 6) * 2 - 6));
                  return (
                    <div key={i} className="flex-1 rounded-xs bg-indigo-100" style={{ height: "10px" }}>
                      <div
                        className="w-full rounded-xs bg-[#5f55ee] transition-all duration-700"
                        style={{ height: `${dynamicH}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Avg Processing Time + Line */}
            <div className="flex flex-col justify-between rounded-lg bg-white p-2 shadow-2xs ring-1 ring-slate-200/60">
              <div className="flex items-center justify-between">
                <span className="text-[7.5px] font-medium text-slate-500">Disbursement</span>
                <CreditCard className="size-2.5 text-sky-500" />
              </div>
              <p className="mt-0.5 text-[11px] font-extrabold tracking-tight text-slate-900">
                16 days
              </p>
              <div className="relative h-2.5 w-full">
                <svg className="h-full w-full overflow-visible" viewBox="0 0 70 14">
                  <path
                    d="M0,12 Q15,10 25,5 T45,7 T70,2"
                    fill="none"
                    stroke="#5f55ee"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="70" cy="2" r="2.5" fill="#5f55ee" className="animate-ping opacity-75" />
                  <circle cx="70" cy="2" r="1.5" fill="#5f55ee" />
                </svg>
              </div>
            </div>

            {/* Card 4: Instant Payout */}
            <div className="flex flex-col justify-between rounded-lg bg-white p-2 shadow-2xs ring-1 ring-slate-200/60">
              <div className="flex items-center justify-between">
                <span className="text-[7.5px] font-medium text-slate-500">Available</span>
                <ArrowUpRight className="size-2.5 text-slate-400" />
              </div>
              <p className="mt-0.5 text-[11px] font-extrabold tracking-tight text-slate-900">
                $ 186,540
              </p>
              <div className="flex items-center gap-1">
                <span className="rounded bg-slate-100 px-1 py-0.2 text-[6px] font-medium text-slate-600">
                  Visa
                </span>
                <span className="rounded bg-[#5f55ee] px-1 py-0.2 text-[6px] font-bold text-white">
                  Stripe
                </span>
              </div>
            </div>
          </div>

          {/* 3. Deep Dark Settlement Detail Screen (Clean Split) */}
          <div className="flex flex-1 flex-col justify-between rounded-xl bg-[#171924] p-2.5 text-white shadow-lg ring-1 ring-white/10">
            {/* Top row */}
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[8.5px] font-bold text-slate-200">
                  Active Invoice Stream
                </span>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-[#242738] px-1.5 py-0.5 text-[7px]">
                <span className="text-slate-400">Batches</span>
                <span className="rounded-full bg-[#5f55ee] px-1.5 py-0.2 font-bold text-white">
                  Unpaid 4
                </span>
              </div>
            </div>

            {/* Split layout */}
            <div className="mt-1.5 grid grid-cols-12 gap-2">
              {/* Left Column: List Items */}
              <div className="col-span-5 flex flex-col gap-1">
                {INVOICES.map((item, idx) => {
                  const isActive = idx === selectedIdx;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedIdx(idx)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg px-2 py-1 text-[7px] transition-all duration-200 ${
                        isActive
                          ? "bg-[#5f55ee] font-bold text-white shadow-xs"
                          : "bg-[#202334] text-slate-300 hover:bg-[#282c40]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`size-3.5 rounded-full flex items-center justify-center text-[6px] font-bold ${
                            isActive ? "bg-white text-[#5f55ee]" : "bg-white/20 text-white"
                          }`}
                        >
                          {item.initials}
                        </div>
                        <span className="font-semibold">{item.id}</span>
                      </div>
                      <span className="font-extrabold tabular-nums">{item.amount}</span>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Active Preview */}
              <div className="col-span-7 flex flex-col justify-between rounded-lg bg-[#292b45] p-2 shadow-inner ring-1 ring-white/10">
                <div className="flex items-center justify-between border-b border-white/10 pb-1">
                  <div>
                    <span className="text-[6px] text-slate-400">Recipient</span>
                    <p className="text-[8px] font-bold text-white">{activeInvoice.recipient}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[6px] text-slate-400">Company</span>
                    <p className="text-[8px] font-bold text-indigo-300">{activeInvoice.company}</p>
                  </div>
                </div>

                <div className="my-1 flex items-center justify-between rounded bg-white/10 px-2 py-1 text-[7px]">
                  <span className="text-slate-300">{activeInvoice.item}</span>
                  <span className="font-extrabold text-white">{activeInvoice.subTotal}</span>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <div>
                    <span className="text-[6px] text-slate-400">Total Due</span>
                    <p className="text-[8.5px] font-black text-white">{activeInvoice.subTotal}</p>
                  </div>
                  <button
                    type="button"
                    className="flex h-4.5 items-center justify-center rounded-full bg-white px-2.5 text-[7px] font-bold text-slate-900 shadow-xs transition hover:bg-slate-100"
                  >
                    Payout now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Laptop Bottom Chassis with Trackpad Notch */}
      <div className="relative flex h-3 w-[106%] items-center justify-center rounded-b-xl border-t border-white/20 bg-gradient-to-b from-[#2e3342] via-[#20242e] to-[#14161d] shadow-[0_14px_30px_rgba(0,0,0,0.4)] sm:h-3.5">
        <div className="h-1 w-14 rounded-full bg-[#0e1015] opacity-90 sm:w-16" />
      </div>

      {/* Realistic Shadow */}
      <div className="h-3 w-[88%] rounded-full bg-black/40 blur-md" />
    </div>
  );
}
