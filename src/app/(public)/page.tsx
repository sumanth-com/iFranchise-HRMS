import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Workplace Platform",
  description: siteConfig.description,
};

export default function HomePage() {
  return <LandingPage />;
}
