"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Monitor } from "lucide-react";

import brandLogo from "@/assets/Logo.png";

const RESET_DELAY_MS = 2600;

/**
 * Shown instead of the portal on phones.
 *
 * Visibility is decided purely in CSS (see `.desktop-notice` in globals.css) so this
 * renders identically on the server and the client — no viewport probing, no layout
 * flash, and no effect at all on the desktop shell.
 */
export function DesktopOnlyNotice() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopyLink = useCallback(async () => {
    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard is unavailable over http or when permission is denied. Select the
      // address instead so it can still be copied by hand.
      window.prompt("Copy this link and open it on your computer:", url);
      return;
    }

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), RESET_DELAY_MS);
  }, []);

  return (
    <div className="desktop-notice">
      <div className="desktop-notice-aurora" aria-hidden />

      <div className="desktop-notice-card">
        <div className="desktop-notice-brand">
          <span className="desktop-notice-brand-mark">
            <Image
              src={brandLogo}
              alt=""
              width={32}
              height={32}
              className="size-8 object-contain"
            />
          </span>
          <span className="desktop-notice-brand-text">iFranchise</span>
        </div>

        <DesktopPreview />

        <span className="desktop-notice-eyebrow">
          <Monitor className="size-3.5" strokeWidth={2.4} aria-hidden />
          Desktop recommended
        </span>

        <h1 className="desktop-notice-title">Best experience on desktop</h1>
        <p className="desktop-notice-copy">
          iFranchise HRMS is designed for larger screens to give you the complete
          experience.
        </p>

        <button
          type="button"
          onClick={handleCopyLink}
          className="desktop-notice-cta"
          data-copied={copied ? "true" : undefined}
        >
          {copied ? (
            <Check className="size-4" strokeWidth={2.6} aria-hidden />
          ) : (
            <Copy className="size-4" strokeWidth={2.3} aria-hidden />
          )}
          {copied ? "Link copied" : "Open in Desktop"}
        </button>

        <p className="desktop-notice-hint" aria-live="polite">
          {copied
            ? "Paste the link into your computer's browser to continue."
            : "Copy this page's link and open it on your computer."}
        </p>
      </div>
    </div>
  );
}

/** Decorative dashboard mockup. Animation is CSS-only and pauses under reduced motion. */
function DesktopPreview() {
  return (
    <div className="desktop-preview" aria-hidden>
      <div className="desktop-preview-window">
        <div className="desktop-preview-bar">
          <span className="desktop-preview-dot" />
          <span className="desktop-preview-dot" />
          <span className="desktop-preview-dot" />
        </div>

        <div className="desktop-preview-body">
          <div className="desktop-preview-rail">
            {[0, 1, 2, 3].map((item) => (
              <span key={item} className="desktop-preview-rail-item" />
            ))}
          </div>

          <div className="desktop-preview-content">
            <div className="desktop-preview-stats">
              {[0, 1, 2].map((item) => (
                <div key={item} className="desktop-preview-stat">
                  <span className="desktop-preview-stat-label" />
                  <span className="desktop-preview-stat-value" />
                </div>
              ))}
            </div>

            <div className="desktop-preview-chart">
              {[0, 1, 2, 3, 4, 5, 6].map((item) => (
                <span
                  key={item}
                  className="desktop-preview-chart-bar"
                  style={{ ["--bar-index" as string]: item }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="desktop-preview-sheen" />
      </div>

      <div className="desktop-preview-stand" />
    </div>
  );
}
