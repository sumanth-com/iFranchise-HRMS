"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Link2, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { ONBOARDING_ROUTES } from "@/types/onboarding";

const INVITE_TOKEN_STORAGE_KEY = "ifranchise_onboarding_invite_token";

export function rememberOnboardingInviteToken(token: string) {
  if (typeof window === "undefined" || !token.trim()) return;
  sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, token.trim());
}

function readStoredInviteToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(INVITE_TOKEN_STORAGE_KEY);
}

function extractInviteToken(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const asUrl = trimmed.startsWith("http") ? new URL(trimmed) : new URL(trimmed, window.location.origin);
    const match = asUrl.pathname.match(/\/onboarding\/invite\/([^/?#]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // Not a full URL — fall through to raw token.
  }

  if (/^[A-Za-z0-9._-]+$/.test(trimmed) && trimmed.length >= 16) {
    return trimmed;
  }

  return null;
}

export function OnboardingSignUpRedirect() {
  const router = useRouter();
  const [inviteInput, setInviteInput] = useState("");
  const [checkingStored, setCheckingStored] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const stored = readStoredInviteToken();
    if (stored) {
      router.replace(ONBOARDING_ROUTES.invite(stored));
      return;
    }
    setCheckingStored(false);
  }, [router]);

  function continueToPasswordSetup() {
    const token = extractInviteToken(inviteInput);
    if (!token) {
      toast.error("Paste the full invitation link from your HR email, or open that link directly.");
      return;
    }

    rememberOnboardingInviteToken(token);
    startTransition(() => {
      router.push(ONBOARDING_ROUTES.invite(token));
    });
  }

  if (checkingStored) {
    return (
      <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center justify-center gap-3 py-8">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Opening secure account setup…</p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/5 ring-1 ring-border/50 dark:shadow-black/25">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-5 text-center text-white sm:px-6">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <UserPlus className="h-4 w-4" strokeWidth={2} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            New candidate
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Set up your password</h1>
          <p className="text-xs leading-snug text-white/65">
            Open your HR invitation link to create your pre-joining portal password.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-card px-5 py-5 sm:px-6">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">
            Invitation link <span className="text-foreground">*</span>
          </Label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="Paste link from your HR invitation email"
              className="h-10 bg-background pl-9 text-sm text-foreground placeholder:text-muted-foreground dark:bg-background"
              onKeyDown={(e) => {
                if (e.key === "Enter") continueToPasswordSetup();
              }}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Use the secure link from your onboarding invitation email. You will set your password on
            the next screen.
          </p>
        </div>

        <Button
          type="button"
          className="h-10 w-full text-sm font-semibold"
          disabled={isPending || !inviteInput.trim()}
          onClick={continueToPasswordSetup}
        >
          <KeyRound className="mr-2 h-4 w-4" />
          {isPending ? "Opening setup…" : "Continue to password setup"}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Already set up?{" "}
          <Link
            href={ONBOARDING_ROUTES.login}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <LogIn className="h-3 w-3" />
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
