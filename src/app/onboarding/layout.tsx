import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Onboarding",
};

export default function OnboardingRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
