import Image from "next/image";
import { type ReactNode } from "react";

import authHero from "@/assets/Auth.png";

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex h-[100dvh] w-screen max-w-[100vw] overflow-hidden bg-[#020b1f]">
      {/* Globe fills left half */}
      <div className="absolute inset-0 lg:right-1/2">
        <Image
          src={authHero}
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-left"
        />
      </div>

      <div className="relative hidden min-w-0 flex-1 lg:block" aria-hidden />

      {/* Right side — ~50% like the design, a bit wider content */}
      <main className="relative z-10 flex h-full w-full flex-col bg-white lg:w-1/2 lg:shrink-0 lg:shadow-[-24px_0_48px_rgba(0,0,0,0.2)]">
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-10 py-10 sm:px-14 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-[480px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
