"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldX,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";

import { submitEmailApprovalAction } from "@/app/approval/[token]/actions";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { Button } from "@/components/common/button";
import type { ApprovalRequestSummary, ProcessOutcome } from "@/lib/approvals/types";

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
      leaveHighlight?: ApprovalRequestSummary["leaveHighlight"];
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
  initialOutcome?: ProcessOutcome;
  initialRejectionReason?: string | null;
};

function isLeaveSummary(summary: ApprovalRequestSummary | undefined): boolean {
  return Boolean(summary?.leaveHighlight) || (summary?.heading.startsWith("Leave request") ?? false);
}

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
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="bg-gradient-to-br from-[#111827] to-[#334155] px-7 py-6 text-white sm:px-8 sm:py-7">
          <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-white text-sm font-bold text-[#111827]">
            IF
          </div>
          <h1 className="text-xl font-bold leading-tight tracking-tight">{heading}</h1>
          {subheading ? (
            <p className="mt-1.5 text-sm text-slate-300">{subheading}</p>
          ) : null}
        </div>
        <div className="px-7 py-6 sm:px-8 sm:py-7">{children}</div>
        <div className="border-t border-[#e5e7eb] bg-[#fbfdff] px-7 py-3.5 sm:px-8">
          <p className="text-xs text-slate-400">iFranchise HRMS · Secure approvals</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ approved }: { approved: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
        approved
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-red-50 text-red-700 ring-1 ring-red-200"
      }`}
    >
      Status: {approved ? "Approved" : "Rejected"}
    </span>
  );
}

function AnimatedMark({ approved }: { approved: boolean }) {
  if (approved) {
    return (
      <div className="approval-result-mark relative flex size-16 items-center justify-center">
        <style>{`
          @keyframes approval-tick-pop {
            0% { transform: scale(0); opacity: 0; }
            70% { transform: scale(1.08); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes approval-tick-draw {
            to { stroke-dashoffset: 0; }
          }
          .approval-tick-circle {
            animation: approval-tick-pop 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
            transform: scale(0);
          }
          .approval-tick-ring {
            stroke-dasharray: 188;
            stroke-dashoffset: 188;
            animation: approval-tick-draw 0.55s ease forwards;
          }
          .approval-tick-check {
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: approval-tick-draw 0.35s ease 0.35s forwards;
          }
        `}</style>
        <svg
          className="approval-tick-circle size-16"
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden
        >
          <circle
            className="approval-tick-ring"
            cx="32"
            cy="32"
            r="30"
            stroke="#059669"
            strokeWidth="3"
          />
          <path
            className="approval-tick-check"
            d="M18 33.5 L27 42.5 L46 22.5"
            stroke="#059669"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="approval-result-mark relative flex size-16 items-center justify-center">
      <style>{`
        @keyframes approval-reject-pop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .approval-reject-icon {
          animation: approval-reject-pop 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          transform: scale(0);
        }
      `}</style>
      <XCircle className="approval-reject-icon size-16 text-red-600" aria-hidden />
    </div>
  );
}

function LeaveResultDetails({
  outcome,
  rejectionReason,
}: {
  outcome: Extract<ProcessOutcome, { status: "approved" | "rejected" }>;
  rejectionReason?: string | null;
}) {
  const highlight = outcome.summary.leaveHighlight;
  const rows = [
    { label: "Employee", value: outcome.employeeName },
    highlight ? { label: "Leave type", value: highlight.leaveType } : null,
    highlight
      ? { label: "Dates", value: `${highlight.startDate} – ${highlight.endDate}` }
      : null,
    highlight ? { label: "Current status", value: highlight.statusLabel } : null,
  ].filter(Boolean) as DetailRow[];

  return (
    <div className="mt-5 w-full rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] text-left">
      <dl className="divide-y divide-[#e5e7eb]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-2.5">
            <dt className="text-xs text-slate-500">{row.label}</dt>
            <dd className="text-right text-xs font-semibold text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>
      {rejectionReason ? (
        <div className="border-t border-[#e5e7eb] px-4 py-3">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Rejection reason:</span>{" "}
            {rejectionReason}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ResultScreen({
  outcome,
  rejectionReason,
  onRetry,
}: {
  outcome: ProcessOutcome;
  rejectionReason?: string | null;
  onRetry?: () => void;
}) {
  if (outcome.status === "approved" || outcome.status === "rejected") {
    const approved = outcome.status === "approved";
    const leave = isLeaveSummary(outcome.summary);
    return (
      <Shell
        heading={
          leave
            ? approved
              ? "Leave Request Approved"
              : "Leave Request Rejected"
            : approved
              ? "Request approved"
              : "Request rejected"
        }
        subheading={
          leave
            ? approved
              ? "The employee's leave request has been successfully approved."
              : "The employee's leave request has been rejected successfully."
            : "Recorded via secure email approval"
        }
      >
        <div className="flex flex-col items-center text-center">
          <AnimatedMark approved={approved} />
          <div className="mt-4">
            <StatusBadge approved={approved} />
          </div>
          {leave ? (
            <LeaveResultDetails outcome={outcome} rejectionReason={rejectionReason} />
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              You have {approved ? "approved" : "rejected"}{" "}
              <span className="font-semibold text-slate-900">{outcome.employeeName}</span>
              &apos;s request.
            </p>
          )}
          <Button
            type="button"
            className="mt-6 h-11 w-full"
            onClick={() => {
              window.location.href = AUTH_ROUTES.dashboard;
            }}
          >
            Open HRMS portal
          </Button>
        </div>
      </Shell>
    );
  }

  if (outcome.status === "already_processed" && outcome.summary) {
    const leave = isLeaveSummary(outcome.summary);
    const approved = outcome.summary.status === "approved";
    if (leave) {
      return (
        <ResultScreen
          outcome={{
            status: approved ? "approved" : "rejected",
            decision: approved ? "approve" : "reject",
            employeeName: outcome.employeeName ?? outcome.summary.employeeName,
            summary: outcome.summary,
          }}
          rejectionReason={rejectionReason}
        />
      );
    }
  }

  const isExpired = outcome.status === "expired";
  const isDone = outcome.status === "already_processed";
  const isUnauthorized = outcome.status === "unauthorized";
  const canRetry = outcome.status === "error" && typeof onRetry === "function";
  const Icon = isExpired
    ? Clock
    : isDone
      ? CheckCircle2
      : isUnauthorized
        ? ShieldX
        : AlertTriangle;
  const tone = isDone ? "text-emerald-600" : isUnauthorized ? "text-amber-600" : "text-red-600";
  const message = "message" in outcome ? outcome.message : "";
  const title = isDone
    ? "Already processed"
    : isExpired
      ? "Link expired"
      : isUnauthorized
        ? "Not authorized"
        : "Something went wrong";

  return (
    <Shell heading={title}>
      <div className="flex flex-col items-center py-2 text-center">
        <Icon className={`size-14 ${tone}`} />
        <p className="mt-4 text-sm text-slate-600">{message}</p>
        {canRetry ? (
          <Button type="button" className="mt-6" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    </Shell>
  );
}

export function ApprovalView({
  token,
  initialAction,
  state,
  initialOutcome,
  initialRejectionReason = null,
}: ApprovalViewProps) {
  const [cancelled, setCancelled] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(
    initialRejectionReason,
  );
  const [outcome, setOutcome] = useState<ProcessOutcome | null>(initialOutcome ?? null);
  const [isPending, startTransition] = useTransition();

  function retryApprove() {
    setError(null);
    startTransition(async () => {
      const result = await submitEmailApprovalAction({
        token,
        action: "approve",
      });
      setOutcome(result);
    });
  }

  function retryRejectLeave() {
    setError(null);
    startTransition(async () => {
      const result = await submitEmailApprovalAction({
        token,
        action: "reject",
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setRejectionReason(initialRejectionReason ?? "Rejected via email approval");
      setOutcome(result);
    });
  }

  function confirmReject() {
    setError(null);
    if (reason.trim().length < 3) {
      setError("Please provide a reason for the rejection.");
      return;
    }
    const trimmed = reason.trim();
    startTransition(async () => {
      const result = await submitEmailApprovalAction({
        token,
        action: "reject",
        reason: trimmed,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setRejectionReason(trimmed);
      setOutcome(result);
    });
  }

  if (outcome) {
    if (outcome.status === "error" && initialAction === "approve") {
      return <ResultScreen outcome={outcome} onRetry={retryApprove} />;
    }
    if (outcome.status === "error" && initialAction === "reject" && state.kind === "ready" && state.leaveHighlight) {
      return <ResultScreen outcome={outcome} onRetry={retryRejectLeave} />;
    }
    if (outcome.status !== "error") {
      return <ResultScreen outcome={outcome} rejectionReason={rejectionReason} />;
    }
  }

  if (state.kind === "error") {
    const Icon =
      state.tone === "expired" ? Clock : state.tone === "done" ? CheckCircle2 : AlertTriangle;
    const tone = state.tone === "done" ? "text-emerald-600" : "text-red-600";
    return (
      <Shell heading={state.title}>
        <div className="flex flex-col items-center py-2 text-center">
          <Icon className={`size-14 ${tone}`} />
          <p className="mt-4 text-sm text-slate-600">{state.message}</p>
        </div>
      </Shell>
    );
  }

  if (cancelled) {
    return (
      <Shell heading="No action taken" subheading="You can close this window">
        <p className="text-center text-sm text-slate-600">
          The leave request was not rejected. You may close this page.
        </p>
      </Shell>
    );
  }

  // Non-leave reject path (kept for future modules): confirmation + reason.
  if (initialAction === "reject") {
    return (
      <Shell heading="Reject this request?" subheading={state.heading}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{state.employeeName}</p>
            {state.leaveHighlight ? (
              <p className="mt-1 text-xs text-slate-500">
                {state.leaveHighlight.leaveType} · {state.leaveHighlight.startDate} –{" "}
                {state.leaveHighlight.endDate}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              Rejection reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Briefly explain why this request is being rejected…"
              disabled={isPending}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              className="h-11 w-full gap-2"
              onClick={confirmReject}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm Rejection
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              className="h-11 w-full"
              onClick={() => setCancelled(true)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // Approve path without a processed outcome yet (rare) — offer Retry.
  return (
    <Shell heading="Leave approval" subheading={state.heading}>
      <div className="flex flex-col items-center text-center">
        <p className="text-sm text-slate-600">
          We could not finish approving this leave request. Please try again.
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <Button
          type="button"
          className="mt-6 h-11 gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled={isPending}
          onClick={retryApprove}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Retry
        </Button>
      </div>
    </Shell>
  );
}
