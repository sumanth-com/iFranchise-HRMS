export type WhatsNewBadge = "new" | "improved" | "fix";

export type WhatsNewUpdate = {
  slug: string;
  date: string;
  releaseLabel?: string;
  title: string;
  description: string;
  category: string;
  badge?: WhatsNewBadge;
  summary?: string;
  improvements?: string[];
  notes?: string[];
};

/** Release/update entries — add future HRMS updates here. */
export const whatsNewUpdates: WhatsNewUpdate[] = [];

export function getWhatsNewUpdate(slug: string): WhatsNewUpdate | undefined {
  return whatsNewUpdates.find((update) => update.slug === slug);
}
