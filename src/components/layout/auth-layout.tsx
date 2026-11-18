"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";

import { consumeLandingToLoginTransition } from "@/lib/landing/navigate-to-login";
import { cn } from "@/lib/utils";

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  const [fromLanding, setFromLanding] = useState(false);

  useEffect(() => {
    setFromLanding(consumeLandingToLoginTransition());
  }, []);

  return (
    <div
      className={cn("auth-page-shell", fromLanding && "auth-enter-from-landing")}
      data-auth-theme="light"
    >
      <main className="auth-page-main">
        <section className="auth-login-frame">
          <aside className="auth-hero-panel" aria-label="iFranchise team illustration">
            <div className="auth-hero-art">
              <Image
                src="/images/auth-team-brand-cutout.webp"
                alt=""
                fill
                priority
                sizes="(max-width: 700px) 100vw, 36vw"
                className="auth-hero-image"
              />
              <div className="auth-hero-copy">
                <h2>People first.<br />Progress together.</h2>
              </div>
            </div>
          </aside>
          <div className="auth-login-side">
            <section className="auth-panel">
              <div className="auth-panel-content">{children}</div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
