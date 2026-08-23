import type { Metadata } from "next";

import { whatsNewUpdates } from "@/config/whats-new-updates";
import { WhatsNewDetailContent } from "@/components/whats-new/whats-new-detail-content";

type WhatsNewDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return whatsNewUpdates.map((update) => ({ slug: update.slug }));
}

export async function generateMetadata({
  params,
}: WhatsNewDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const update = whatsNewUpdates.find((entry) => entry.slug === slug);

  return {
    title: update ? update.title : "Update",
    description: update?.description,
  };
}

export default async function WhatsNewDetailPage({ params }: WhatsNewDetailPageProps) {
  const { slug } = await params;
  return <WhatsNewDetailContent slug={slug} />;
}
