"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldX,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { submitEmailApprovalAction } from "@/app/approval/[token]/actions";
import { Button } from "@/components/common/button";
import type { ProcessOutcome } from "@/lib/approvals/types";

type DetailRow = { label: string; value: string };

export type ApprovalViewState =
  | {
      kind: "ready";
      subject: string;
      heading: string;
      employeeName: string;
      approverName: string;
      detailRows: DetailRow[];
      reason: string | null;
    }
  | {
      kind: "error";
      tone: "expired" | "done" | "invalid";
      title: string;
      message: string;
    };

type ApprovalViewProps = {
  token: string;
  initialAction: "approve" | "reject";
  state: ApprovalViewState;
};

function Shell({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="bg-gradient-to-br from-[#111827] to-[#334155] px-8 py-7 text-white">
          <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-white text-sm font-bold text-[#111827]">
            IF
          </div>
          <h1 className="text-xl font-bold leading-tight">{heading}</h1>
          {subheading ? (
            <p className="mt-1.5 text-sm text-slate-300">{subheading}</p>
          ) : null}
        </div>
        <div className="px-8 py-7">{children}</div>
        <div className="border-t border-[#e5e7eb] bg-[#fbfdff] px-8 py-4">
          <p className="text-xs text-slate-400">iFranchise HRMS · Secure approvals</p>
        </div>
      </div>
    </div>
  );
}

function DetailsCard({ rows, reason }: { rows: DetailRow[]; reason: string | null }) {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc]">
      <dl className="divide-y divide-[#e5e7eb]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-2.5">
            <dt className="text-xs text-slate-500">{row.label}</dt>
            <dd className="text-right text-xs font-semibold text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>
      {reason ? (
        <div className="border-t border-[#e5e7eb] px-4 py-3">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Reason:</span> {reason}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ResultScreen({ outcome }: { outcome: ProcessOutcome }) {
  if (outcome.status === "approved" || outcome.status === "rejected") {
    const approved = outcome.status === "approved";
    return (
      <Shell
        heading={approved ? "Request approved" : "Request rejected"}
        subheading="Recorded via secure email approval"
      >
        <div className="flex flex-col items-center py-4 text-center">
          {approved ? (
            <CheckCircle2 className="size-14 text-emerald-600" />
          ) : (
            <XCircle className="size-14 text-red-600" />
          )}
          <p className="mt-4 text-sm text-slate-600">
            You have {approved ? "approved" : "rejected"}{" "}
            <span className="font-semibold text-slate-900">{outcome.employeeName}</span>&apos;s
            request. All portals and records have been updated.
          </p>
          <Button className="mt-6" render={<Link href="/login" />}>
            Go to portal
          </Button>
        </div>
      </Shell>
    );
  }

  const isExpired = outcome.status === "expired";
  const isDone = outcome.status === "already_processed";
  const isUnauthorized = outcome.status === "unauthorized";
  const Icon = isExpired ? Clock : isDone ? CheckCircle2 : isUnauthorized ? ShieldX : AlertTriangle;
  const tone = isDone ? "text-emerald-600" : isUnauthorized ? "text-amber-600" : "text-red-600";
  const message = "message" in outcome ? outcome.message : "";

  return (
    <Shell heading="Approval status">
      <div className="flex flex-col items-center py-4 text-center">
        <Icon className={`size-14 ${tone}`} />
        <p className="mt-4 text-sm text-slate-600">{message}</p>
        <Button variant="outline" className="mt-6" render={<Link href="/login" />}>
          Go to portal
        </Button>
      </div>
    </Shell>
  );
}

export function ApprovalView({ token, initialAction, state }: ApprovalViewProps) {
  const [mode, setMode] = useState<"approve" | "reject">(initialAction);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ProcessOutcome | null>(null);
  const [isPending, startTransition] = useTransition();

  if (state.kind === "error") {
    const Icon =
      state.tone === "expired" ? Clock : state.tone === "done" ? CheckCircle2 : AlertTriangle;
    const tone = state.tone === "done" ? "text-emerald-600" : "text-red-600";
    return (
      <Shell heading={state.title}>
        <div className="flex flex-col items-center py-4 text-center">
          <Icon className={`size-14 ${tone}`} />
          <p className="mt-4 text-sm text-slate-600">{state.message}</p>
          <Button variant="outline" className="mt-6" render={<Link href="/login" />}>
            Go to portal
          </Button>
        </div>
      </Shell>
    );
  }

  if (outcome && outcome.status !== "error") {
    return <ResultScreen outcome={outcome} />;
  }

  function submit() {
    setError(null);
    if (mode === "reject" && reason.trim().length < 3) {
      setError("Please provide a reason for the rejection.");
      return;
    }
    startTransition(async () => {
      const result = await submitEmailApprovalAction({
        token,
        action: mode,
        reason: mode === "reject" ? reason.trim() : undefined,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setOutcome(result);
    });
  }

  return (
    <Shell heading={state.subject} subheading={state.heading}>
      <p className="mb-4 text-sm text-slate-600">
        Hello {state.approverName || "there"}, review the request below and choose an action.
      </p>

      <DetailsCard rows={state.detailRows} reason={state.reason} />

      <div className="mt-6">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode("approve")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === "approve" ? "bg-emerald-600 text-white shadow" : "text-slate-600"
            }`}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setMode("reject")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === "reject" ? "bg-red-600 text-white shadow" : "text-slate-600"
            }`}
          >
            Reject
          </button>
        </div>

        {mode === "reject" ? (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              Rejection reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Let the employee know why this request is being rejected…"
              disabled={isPending}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <Button
          type="button"
          onClick={submit}
          disabled={isPending}
          className={`mt-4 w-full gap-2 ${
            mode === "approve"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "approve" ? "Confirm approval" : "Confirm rejection"}
        </Button>
      </div>
    </Shell>
  );
}
