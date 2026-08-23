import type { Metadata } from "next";

import { WhatsNewPageContent } from "@/components/whats-new/whats-new-page-content";

export const metadata: Metadata = {
  title: "What's New",
  description: "Latest features, improvements and updates in iFranchise HRMS.",
};

export default function WhatsNewPage() {
  return <WhatsNewPageContent />;
}
